import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Image // <--- CAMBIO 1: Agregado Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const IMAGENES_EJERCICIOS = {
    'press de banca': '🏋️', 'bench press': '🏋️',
    'sentadilla': '🦵', 'squat': '🦵', 'goblet': '🦵',
    'peso muerto': '💪', 'deadlift': '💪',
    'dominadas': '🔝', 'pull up': '🔝', 'jalón': '🔝',
    'remo': '🚣', 'row': '🚣',
    'plancha': '🧘', 'plank': '🧘',
    'hip thrust': '🍑', 'puente de glúteo': '🍑',
    'zancadas': '🚶', 'lunges': '🚶',
    'curl': '💪', 'bicep': '💪',
    'press hombros': '🙆', 'shoulder': '🙆', 'press militar': '🙆',
    'triceps': '💪', 'fondos': '💪', 'tríceps': '💪',
    'leg press': '🦵', 'extensión': '🦵', 'prensa': '🦵',
    'abdominales': '🎯', 'crunch': '🎯',
    'cardio': '🏃', 'caminata': '🚶', 'bicicleta': '🚴',
    'face pull': '🎯', 'elevaciones': '🙆',
};

function obtenerEmoji(nombre) {
    const n = nombre.toLowerCase();
    for (const [clave, emoji] of Object.entries(IMAGENES_EJERCICIOS)) {
        if (n.includes(clave)) return emoji;
    }
    return '🏃';
}

const COLORES_GRUPO = {
    'pecho': '#ef4444', 'triceps': '#ef4444', 'tríceps': '#ef4444',
    'espalda': '#2563eb', 'biceps': '#2563eb', 'bíceps': '#2563eb', 'dorsales': '#2563eb',
    'piernas': '#16a34a', 'gluteos': '#16a34a', 'glúteos': '#16a34a', 'cuádriceps': '#16a34a',
    'hombros': '#f59e0b', 'deltoides': '#f59e0b',
    'abdomen': '#8b5cf6', 'core': '#8b5cf6',
    'full body': '#0ea5e9', 'cuerpo completo': '#0ea5e9',
};

function obtenerColor(grupoMuscular) {
    if (!grupoMuscular) return '#2563eb';
    const g = grupoMuscular.toLowerCase();
    for (const [clave, color] of Object.entries(COLORES_GRUPO)) {
        if (g.includes(clave)) return color;
    }
    return '#2563eb';
}

export default function RutinaScreen() {
    const [rutina, setRutina] = useState([]);
    const [diaActivo, setDiaActivo] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [completados, setCompletados] = useState({});
    const [guardandoEjercicio, setGuardandoEjercicio] = useState(null);
    const [modalFin, setModalFin] = useState(false);
    const [pesoActualizado, setPesoActualizado] = useState('');
    const [guardandoPeso, setGuardandoPeso] = useState(false);
    // <--- CAMBIO 2: Estado de imágenes
    const [imagenesEjercicios, setImagenesEjercicios] = useState({});

    useFocusEffect(
        useCallback(() => {
            cargarRutinaGuardada();
        }, [])
    );

    async function cargarRutinaGuardada() {
        try {
            const rutinaGuardada = await AsyncStorage.getItem('forja_rutina_json');
            const completadosGuardados = await AsyncStorage.getItem('forja_completados');
            if (rutinaGuardada) {
                const data = JSON.parse(rutinaGuardada);
                setRutina(data);
                cargarImagenes(data); // <--- CAMBIO 3a: Cargar imágenes al iniciar
            }
            if (completadosGuardados) setCompletados(JSON.parse(completadosGuardados));
        } catch (e) {
            console.log('Sin rutina guardada');
        }
    }

    // <--- CAMBIO 3b: Función para obtener los GIFs desde la API
    async function cargarImagenes(diasRutina) {
        const token = await AsyncStorage.getItem('forja_token');
        const nuevasImagenes = {};
        for (const dia of diasRutina) {
            for (const ejercicio of dia.ejercicios || []) {
                const nombreIngles = ejercicio.nombre_ingles;
                const nombreEspanol = ejercicio.nombre_espanol || ejercicio.nombre;
                if (!nombreIngles) continue;
                try {
                    const respuesta = await axios.post(
                        `${API_URL}/ejercicios/obtener-imagen.php`,
                        { nombre_ingles: nombreIngles, nombre_espanol: nombreEspanol },
                        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
                    );
                    if (respuesta.data.gif_url) {
                        nuevasImagenes[nombreEspanol] = respuesta.data.gif_url;
                    }
                } catch (e) {
                    console.log('Sin imagen para:', nombreIngles);
                }
            }
        }
        setImagenesEjercicios(nuevasImagenes);
    }

    async function generarRutina() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.post(
                `${API_URL}/ia/generar-rutina.php`,
                { tipo: 'semanal' },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
            );
            const diasRutina = respuesta.data.rutina;
            setRutina(diasRutina);
            cargarImagenes(diasRutina); // <--- CAMBIO 3c: Cargar imágenes tras generar
            setCompletados({});
            setDiaActivo(0);
            await AsyncStorage.setItem('forja_rutina_json', JSON.stringify(diasRutina));
            await AsyncStorage.removeItem('forja_completados');
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar la rutina. Intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    }

    async function toggleEjercicio(diaIndex, ejIndex) {
        const clave = `${diaIndex}_${ejIndex}`;
        const nuevoEstado = !completados[clave];
        const nuevosCompletados = { ...completados, [clave]: nuevoEstado };
        setCompletados(nuevosCompletados);
        await AsyncStorage.setItem('forja_completados', JSON.stringify(nuevosCompletados));

        const ejerciciosDia = rutina[diaIndex]?.ejercicios || [];
        const todosCompletados = ejerciciosDia.every((_, i) => {
            const k = `${diaIndex}_${i}`;
            return k === clave ? nuevoEstado : !!nuevosCompletados[k];
        });
        if (todosCompletados && nuevoEstado) {
            setTimeout(() => setModalFin(true), 400);
        }

        setGuardandoEjercicio(clave);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const ejercicio = ejerciciosDia[ejIndex];
            const hoy = new Date().toISOString().split('T')[0];
            await axios.post(
                `${API_URL}/entreno/completar-ejercicio.php`,
                {
                    nombre_ejercicio: ejercicio.nombre,
                    series: ejercicio.series,
                    repeticiones: ejercicio.repeticiones,
                    completado: nuevoEstado ? 1 : 0,
                    fecha: hoy,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (e) {
            console.log('Error guardando ejercicio');
        } finally {
            setGuardandoEjercicio(null);
        }
    }

    async function guardarPesoActualizado() {
        if (pesoActualizado && !isNaN(parseFloat(pesoActualizado))) {
            setGuardandoPeso(true);
            try {
                const token = await AsyncStorage.getItem('forja_token');
                await axios.post(
                    `${API_URL}/usuario/actualizar-peso.php`,
                    { peso_actual: parseFloat(pesoActualizado) },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                Alert.alert('✅', '¡Excelente entreno! Peso actualizado.');
            } catch (e) {
                Alert.alert('✅', '¡Excelente entreno!');
            } finally {
                setGuardandoPeso(false);
            }
        }
        setModalFin(false);
        setPesoActualizado('');
    }

    function contarCompletadosDia(diaIndex) {
        const ejercicios = rutina[diaIndex]?.ejercicios || [];
        const total = ejercicios.length;
        const hechos = ejercicios.filter((_, i) => completados[`${diaIndex}_${i}`]).length;
        return { hechos, total };
    }

    const diaData = rutina[diaActivo];
    const { hechos, total } = contarCompletadosDia(diaActivo);
    const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;
    const colorDia = obtenerColor(diaData?.grupo_muscular);

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>Mi Rutina</Text>
                <TouchableOpacity
                    style={[estilos.botonGenerar, cargando && estilos.desactivado]}
                    onPress={generarRutina}
                    disabled={cargando}
                >
                    {cargando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={estilos.botonGenerarTexto}>
                            {rutina.length > 0 ? '🔄' : '✨ Generar'}
                          </Text>
                    }
                </TouchableOpacity>
            </View>

            {cargando && (
                <View style={estilos.cargandoContenedor}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={estilos.cargandoTexto}>Creando tu rutina personalizada...</Text>
                </View>
            )}

            {!cargando && rutina.length === 0 && (
                <View style={estilos.vacio}>
                    <Text style={estilos.vacioIcono}>🏋️</Text>
                    <Text style={estilos.vacioTitulo}>Sin rutina todavía</Text>
                    <Text style={estilos.vacioTexto}>
                        Toca ✨ Generar y la IA creará tu rutina personalizada
                    </Text>
                    <TouchableOpacity style={estilos.botonVacio} onPress={generarRutina}>
                        <Text style={estilos.botonVacioTexto}>✨ Generar mi rutina</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!cargando && rutina.length > 0 && (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Selector de días */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={estilos.diasScroll}
                    >
                        {rutina.map((dia, i) => {
                            const { hechos: h, total: t } = contarCompletadosDia(i);
                            const completo = t > 0 && h === t;
                            const color = obtenerColor(dia.grupo_muscular);
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        estilos.diaBtn,
                                        diaActivo === i && { backgroundColor: color, borderColor: color },
                                        completo && estilos.diaBtnCompleto,
                                    ]}
                                    onPress={() => setDiaActivo(i)}
                                >
                                    <Text style={[estilos.diaBtnNum, diaActivo === i && { color: '#fff' }]}>
                                        {completo ? '✅' : `D${i + 1}`}
                                    </Text>
                                    <Text style={[estilos.diaBtnNombre, diaActivo === i && { color: '#ffffffcc' }]} numberOfLines={1}>
                                        {dia.nombre?.split(' ')[0]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Header del día */}
                    {diaData && (
                        <View style={[estilos.diaHeader, { borderLeftColor: colorDia }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.diaNombre}>{diaData.nombre}</Text>
                                <Text style={estilos.diaGrupo}>{diaData.grupo_muscular}</Text>
                                {diaData.justificacion_clinica && (
                                    <Text style={estilos.diaJustificacion}>
                                        🩺 {diaData.justificacion_clinica}
                                    </Text>
                                )}
                            </View>
                            <View style={estilos.diaProgresoContenedor}>
                                <Text style={[estilos.diaProgresoNum, { color: colorDia }]}>{porcentaje}%</Text>
                                <Text style={estilos.diaProgresoSub}>{hechos}/{total}</Text>
                            </View>
                        </View>
                    )}

                    <View style={estilos.barraContenedor}>
                        <View style={estilos.barraFondo}>
                            <View style={[estilos.barraRelleno, { width: `${porcentaje}%`, backgroundColor: colorDia }]} />
                        </View>
                    </View>

                    {/* Ejercicios */}
                    {diaData?.ejercicios.map((ejercicio, ejIndex) => {
                        const clave = `${diaActivo}_${ejIndex}`;
                        const estaCompleto = !!completados[clave];
                        const guardando = guardandoEjercicio === clave;
                        const emoji = obtenerEmoji(ejercicio.nombre);
                        const urlImagen = imagenesEjercicios[ejercicio.nombre_espanol || ejercicio.nombre];

                        return (
                            <View key={ejIndex} style={[
                                estilos.ejercicioCard,
                                estaCompleto && estilos.ejercicioCardCompleto
                            ]}>
                                <View style={[estilos.ejercicioFranja, { backgroundColor: estaCompleto ? '#16a34a' : colorDia }]} />
                                <View style={estilos.ejercicioContenido}>

                                    {/* CAMBIO 4: Lógica de Imagen o Emoji */}
                                    {urlImagen ? (
                                        <Image
                                            source={{ uri: urlImagen }}
                                            style={estilos.ejercicioImagen}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[estilos.ejercicioEmoji, { backgroundColor: (estaCompleto ? '#16a34a' : colorDia) + '20' }]}>
                                            <Text style={estilos.ejercicioEmojiTexto}>{emoji}</Text>
                                        </View>
                                    )}

                                    <View style={estilos.ejercicioInfo}>
                                        <Text style={[estilos.ejercicioNombre, estaCompleto && estilos.textoTachado]}>
                                            {ejercicio.nombre}
                                        </Text>

                                        <View style={estilos.chipsContenedor}>
                                            <View style={[estilos.chip, { backgroundColor: colorDia + '20' }]}>
                                                <Text style={[estilos.chipValor, { color: colorDia }]}>{ejercicio.series}</Text>
                                                <Text style={estilos.chipLabel}> series</Text>
                                            </View>
                                            <View style={[estilos.chip, { backgroundColor: colorDia + '20' }]}>
                                                <Text style={[estilos.chipValor, { color: colorDia }]}>{ejercicio.repeticiones || ejercicio.reps}</Text>
                                                <Text style={estilos.chipLabel}> reps</Text>
                                            </View>
                                            {ejercicio.descanso && (
                                                <View style={estilos.chipDescanso}>
                                                    <Text style={estilos.chipDescansoTexto}>⏱ {ejercicio.descanso}</Text>
                                                </View>
                                            )}
                                            {ejercicio.rir !== undefined && ejercicio.rir !== null && (
                                                <View style={estilos.chipRir}>
                                                    <Text style={estilos.chipRirTexto}>RIR {ejercicio.rir}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {ejercicio.tecnica_clave && (
                                            <Text style={estilos.ejercicioNota}>💡 {ejercicio.tecnica_clave}</Text>
                                        )}
                                        {ejercicio.sustituto_lesion && (
                                            <Text style={estilos.ejercicioSustituto}>🔄 {ejercicio.sustituto_lesion}</Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={[estilos.checkbox, estaCompleto && estilos.checkboxActivo]}
                                        onPress={() => toggleEjercicio(diaActivo, ejIndex)}
                                        disabled={guardando}
                                    >
                                        {guardando
                                            ? <ActivityIndicator size="small" color="#fff" />
                                            : <Text style={estilos.checkboxTexto}>{estaCompleto ? '✓' : ''}</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            <Modal visible={modalFin} transparent animationType="fade">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.modalCard}>
                        <Text style={estilos.modalEmoji}>🎉</Text>
                        <Text style={estilos.modalTitulo}>¡Entreno completado!</Text>
                        <Text style={estilos.modalSub}>¿Cuánto pesaste hoy? (opcional)</Text>
                        <TextInput
                            style={estilos.modalInput}
                            value={pesoActualizado}
                            onChangeText={setPesoActualizado}
                            keyboardType="numeric"
                            placeholder="Ej: 54.5"
                            placeholderTextColor="#555"
                        />
                        <TouchableOpacity
                            style={estilos.modalBoton}
                            onPress={guardarPesoActualizado}
                            disabled={guardandoPeso}
                        >
                            {guardandoPeso
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={estilos.modalBotonTexto}>Guardar y cerrar</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalFin(false)}>
                            <Text style={estilos.modalSaltar}>Saltar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 55, paddingBottom: 16, paddingHorizontal: 24,
        borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
    },
    headerTitulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
    botonGenerar: {
        backgroundColor: '#2563eb', borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 16,
    },
    botonGenerarTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },
    desactivado: { opacity: 0.6 },
    cargandoContenedor: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cargandoTexto: { color: '#555', marginTop: 16, fontSize: 14 },
    vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
    vacioIcono: { fontSize: 60, marginBottom: 16 },
    vacioTitulo: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    vacioTexto: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    botonVacio: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
    botonVacioTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    diasScroll: { paddingHorizontal: 20, paddingVertical: 16 },
    diaBtn: {
        borderWidth: 1, borderColor: '#2563eb30', borderRadius: 14,
        paddingVertical: 10, paddingHorizontal: 14, marginRight: 10, alignItems: 'center', minWidth: 60,
    },
    diaBtnCompleto: { borderColor: '#16a34a' },
    diaBtnNum: { color: '#fff', fontSize: 15, fontWeight: '800' },
    diaBtnNombre: { color: '#555', fontSize: 10, marginTop: 2 },
    diaHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginHorizontal: 20, marginBottom: 8, paddingLeft: 14,
        borderLeftWidth: 3,
    },
    diaNombre: { color: '#fff', fontSize: 17, fontWeight: '800' },
    diaGrupo: { color: '#555', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
    diaJustificacion: { color: '#f59e0b', fontSize: 11, marginTop: 6, lineHeight: 16 },
    diaProgresoContenedor: { alignItems: 'flex-end' },
    diaProgresoNum: { fontSize: 22, fontWeight: '900' },
    diaProgresoSub: { color: '#555', fontSize: 11 },
    barraContenedor: { paddingHorizontal: 20, marginBottom: 16 },
    barraFondo: { height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
    barraRelleno: { height: 4, borderRadius: 2 },
    ejercicioCard: {
        marginHorizontal: 20, marginBottom: 10, borderRadius: 14,
        backgroundColor: '#1a1a2e', flexDirection: 'row',
        overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff08',
    },
    ejercicioCardCompleto: { opacity: 0.6 },
    ejercicioFranja: { width: 4 },
    ejercicioContenido: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
    // Estilo agregado para la imagen GIF
    ejercicioImagen: {
        width: 52, height: 52, borderRadius: 12, marginRight: 12, backgroundColor: '#1a1a2e',
    },
    ejercicioEmoji: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    ejercicioEmojiTexto: { fontSize: 26 },
    ejercicioInfo: { flex: 1 },
    ejercicioNombre: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    textoTachado: { textDecorationLine: 'line-through', color: '#444' },
    chipsContenedor: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 8,
        paddingVertical: 3, paddingHorizontal: 8, marginRight: 6, marginBottom: 4,
    },
    chipValor: { fontSize: 13, fontWeight: '800' },
    chipLabel: { color: '#555', fontSize: 11 },
    chipDescanso: {
        backgroundColor: '#1e3a2e', borderRadius: 8,
        paddingVertical: 3, paddingHorizontal: 8, marginRight: 6, marginBottom: 4,
    },
    chipDescansoTexto: { color: '#4ade80', fontSize: 11, fontWeight: '600' },
    chipRir: {
        backgroundColor: '#f59e0b20', borderRadius: 8,
        paddingVertical: 3, paddingHorizontal: 8, marginBottom: 4,
    },
    chipRirTexto: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
    ejercicioNota: { color: '#666', fontSize: 11, marginTop: 4, lineHeight: 16 },
    ejercicioSustituto: { color: '#555', fontSize: 11, marginTop: 4, fontStyle: 'italic' },
    checkbox: {
        width: 34, height: 34, borderRadius: 17, borderWidth: 2,
        borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    checkboxActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    checkboxTexto: { color: '#fff', fontSize: 17, fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', alignItems: 'center' },
    modalCard: {
        backgroundColor: '#0f0f1f', borderRadius: 24, padding: 28,
        alignItems: 'center', width: '85%', borderWidth: 1, borderColor: '#16a34a30',
    },
    modalEmoji: { fontSize: 50, marginBottom: 12 },
    modalTitulo: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
    modalSub: { color: '#555', fontSize: 14, marginBottom: 16 },
    modalInput: {
        backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2563eb30',
        borderRadius: 12, padding: 14, color: '#fff', fontSize: 16,
        width: '100%', textAlign: 'center', marginBottom: 16,
    },
    modalBoton: {
        backgroundColor: '#16a34a', borderRadius: 12,
        paddingVertical: 14, paddingHorizontal: 28, width: '100%', alignItems: 'center',
    },
    modalBotonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalSaltar: { color: '#555', fontSize: 13, marginTop: 14 },
});