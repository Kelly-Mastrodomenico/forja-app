import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Image, Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Imágenes de ejercicios desde ExerciseDB (API pública sin key)
const IMAGENES_EJERCICIOS = {
    'sentadilla': 'https://api.exercisedb.io/image/eGWNaGPXtH3OSM',
    'squat': 'https://api.exercisedb.io/image/eGWNaGPXtH3OSM',
    'press banca': 'https://api.exercisedb.io/image/KnBRnpcJJ5KZLT',
    'bench press': 'https://api.exercisedb.io/image/KnBRnpcJJ5KZLT',
    'peso muerto': 'https://api.exercisedb.io/image/eQ5sGlLfMHZ7SV',
    'deadlift': 'https://api.exercisedb.io/image/eQ5sGlLfMHZ7SV',
    'dominadas': 'https://api.exercisedb.io/image/uXjDQL9pjHjmGX',
    'pull up': 'https://api.exercisedb.io/image/uXjDQL9pjHjmGX',
    'remo': 'https://api.exercisedb.io/image/5sWXMBEfaHqbLd',
    'plancha': 'https://api.exercisedb.io/image/XvJtbmNoNH6bYZ',
    'plank': 'https://api.exercisedb.io/image/XvJtbmNoNH6bYZ',
    'hip thrust': 'https://api.exercisedb.io/image/TA3SxxQWkgGkPv',
    'zancadas': 'https://api.exercisedb.io/image/G8xmNBqyJqYGZr',
    'lunges': 'https://api.exercisedb.io/image/G8xmNBqyJqYGZr',
    'curl biceps': 'https://api.exercisedb.io/image/u3VkKMYmkH7fXb',
    'bicep curl': 'https://api.exercisedb.io/image/u3VkKMYmkH7fXb',
    'press hombros': 'https://api.exercisedb.io/image/oEoIhJPpvHoopO',
    'shoulder press': 'https://api.exercisedb.io/image/oEoIhJPpvHoopO',
    'triceps': 'https://api.exercisedb.io/image/HnolHONNHHm6Kv',
    'leg press': 'https://api.exercisedb.io/image/2DVmhIHBfbhOqS',
    'extensión cuádriceps': 'https://api.exercisedb.io/image/2DVmhIHBfbhOqS',
};

function obtenerImagenEjercicio(nombreEjercicio) {
    const nombre = nombreEjercicio.toLowerCase();
    for (const [clave, url] of Object.entries(IMAGENES_EJERCICIOS)) {
        if (nombre.includes(clave)) return url;
    }
    return null;
}

function parsearRutina(textoRutina) {
    const dias = [];
    const seccionesDia = textoRutina.split(/\*\*día\s+\d+[:\s]/gi).filter(s => s.trim());
    const encabezadosDia = textoRutina.match(/\*\*día\s+\d+[:\s][^\*]*/gi) || [];

    seccionesDia.forEach((seccion, i) => {
        const tituloDia = encabezadosDia[i]
            ? encabezadosDia[i].replace(/\*\*/g, '').trim()
            : `Día ${i + 1}`;

        const lineas = seccion.split('\n').filter(l => l.trim());
        const ejercicios = [];

        lineas.forEach(linea => {
            const lineaLimpia = linea.replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim();
            if (!lineaLimpia || lineaLimpia.length < 5) return;

            // Detectar patrones como "Sentadilla: 4x8-10, descanso 60s"
            const matchEjercicio = lineaLimpia.match(/^(.+?)[\s:]+(\d+)\s*[x×]\s*([\d\-]+(?:\s*(?:reps|rep|repeticiones))?)/i);

            if (matchEjercicio) {
                ejercicios.push({
                    nombre: matchEjercicio[1].trim(),
                    series: matchEjercicio[2],
                    reps: matchEjercicio[3].replace(/\s*(reps|rep|repeticiones)/i, ''),
                    descanso: extraerDescanso(lineaLimpia),
                    completado: false,
                    imagen: obtenerImagenEjercicio(matchEjercicio[1]),
                    descripcion: extraerDescripcion(lineaLimpia),
                });
            } else if (!lineaLimpia.toLowerCase().includes('descanso') &&
                       !lineaLimpia.toLowerCase().includes('minutos') &&
                       ejercicios.length > 0 &&
                       lineaLimpia.length > 10) {
                // Agregar como nota al último ejercicio
                ejercicios[ejercicios.length - 1].descripcion = lineaLimpia;
            }
        });

        if (ejercicios.length > 0) {
            dias.push({ titulo: tituloDia, ejercicios });
        }
    });

    return dias;
}

function extraerDescanso(linea) {
    const match = linea.match(/descanso[:\s]+(\d+\s*(?:s|seg|segundos|min|minutos))/i);
    return match ? match[1] : null;
}

function extraerDescripcion(linea) {
    const partes = linea.split(/[,;]/);
    if (partes.length > 1) {
        return partes.slice(1).join(',').replace(/descanso.*/i, '').trim();
    }
    return null;
}

export default function RutinaScreen() {
    const [vistaActiva, setVistaActiva] = useState('diaria');
    const [rutina, setRutina] = useState('');
    const [diasParsados, setDiasParsados] = useState([]);
    const [diaActivo, setDiaActivo] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [ejerciciosCompletados, setEjerciciosCompletados] = useState({});
    const [guardandoEjercicio, setGuardandoEjercicio] = useState(null);

    useFocusEffect(
        useCallback(() => {
            cargarRutinaGuardada();
        }, [])
    );

    async function cargarRutinaGuardada() {
        try {
            const rutinaGuardada = await AsyncStorage.getItem('forja_rutina');
            const completadosGuardados = await AsyncStorage.getItem('forja_completados_hoy');
            if (rutinaGuardada) {
                setRutina(rutinaGuardada);
                const dias = parsearRutina(rutinaGuardada);
                setDiasParsados(dias);
            }
            if (completadosGuardados) {
                setEjerciciosCompletados(JSON.parse(completadosGuardados));
            }
        } catch (error) {
            console.log('Sin rutina guardada');
        }
    }

    async function generarRutina() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.post(
                `${API_URL}/ia/generar-rutina.php`,
                { tipo: vistaActiva },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
            );
            const textoRutina = respuesta.data.rutina || respuesta.data.respuesta || '';
            setRutina(textoRutina);
            await AsyncStorage.setItem('forja_rutina', textoRutina);
            // Resetear completados al generar nueva rutina
            setEjerciciosCompletados({});
            await AsyncStorage.removeItem('forja_completados_hoy');
            const dias = parsearRutina(textoRutina);
            setDiasParsados(dias);
            setDiaActivo(0);
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar la rutina. Intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    }

    async function toggleEjercicio(nombreEjercicio, ejercicio) {
        const clave = `${diaActivo}_${nombreEjercicio}`;
        const nuevoEstado = !ejerciciosCompletados[clave];

        const nuevosCompletados = { ...ejerciciosCompletados, [clave]: nuevoEstado };
        setEjerciciosCompletados(nuevosCompletados);
        await AsyncStorage.setItem('forja_completados_hoy', JSON.stringify(nuevosCompletados));

        setGuardandoEjercicio(clave);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const hoy = new Date().toISOString().split('T')[0];
            await axios.post(
                `${API_URL}/entreno/completar-ejercicio.php`,
                {
                    nombre_ejercicio: nombreEjercicio,
                    series: ejercicio.series,
                    repeticiones: ejercicio.reps,
                    completado: nuevoEstado ? 1 : 0,
                    fecha: hoy,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.log('Error al guardar ejercicio:', error.message);
        } finally {
            setGuardandoEjercicio(null);
        }
    }

    function contarCompletados(diaIndex) {
        if (!diasParsados[diaIndex]) return { completados: 0, total: 0 };
        const total = diasParsados[diaIndex].ejercicios.length;
        const completados = diasParsados[diaIndex].ejercicios.filter((ej) => {
            const clave = `${diaIndex}_${ej.nombre}`;
            return ejerciciosCompletados[clave];
        }).length;
        return { completados, total };
    }

    const diaData = diasParsados[diaActivo];
    const { completados, total } = contarCompletados(diaActivo);
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>Mi Rutina</Text>
                <View style={estilos.selectorVista}>
                    {['diaria', 'semanal'].map(v => (
                        <TouchableOpacity
                            key={v}
                            style={[estilos.vistaBtn, vistaActiva === v && estilos.vistaBtnActivo]}
                            onPress={() => setVistaActiva(v)}
                        >
                            <Text style={[estilos.vistaBtnTexto, vistaActiva === v && { color: '#fff' }]}>
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Botón generar */}
                <TouchableOpacity
                    style={[estilos.botonGenerar, cargando && estilos.botonDesactivado]}
                    onPress={generarRutina}
                    disabled={cargando}
                >
                    {cargando
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={estilos.botonGenerarTexto}>
                            {rutina ? '🔄 Regenerar con IA' : '✨ Generar rutina con IA'}
                          </Text>
                    }
                </TouchableOpacity>

                {cargando && (
                    <Text style={estilos.cargandoTexto}>La IA está creando tu rutina personalizada...</Text>
                )}

                {/* Selector de días */}
                {diasParsados.length > 0 && (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={estilos.diasScroll}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                            {diasParsados.map((dia, i) => {
                                const { completados: c, total: t } = contarCompletados(i);
                                const completo = t > 0 && c === t;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[estilos.diaBtn, diaActivo === i && estilos.diaBtnActivo, completo && estilos.diaBtnCompleto]}
                                        onPress={() => setDiaActivo(i)}
                                    >
                                        <Text style={[estilos.diaBtnTexto, diaActivo === i && { color: '#fff' }]}>
                                            {completo ? '✅' : `Día ${i + 1}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Título del día y progreso */}
                        {diaData && (
                            <View style={estilos.diaHeaderCard}>
                                <View style={estilos.diaHeaderFila}>
                                    <Text style={estilos.diaTitulo} numberOfLines={1}>
                                        {diaData.titulo}
                                    </Text>
                                    <Text style={estilos.diaProgreso}>{completados}/{total}</Text>
                                </View>
                                <View style={estilos.barraFondo}>
                                    <View style={[estilos.barraRelleno, { width: `${porcentaje}%` }]} />
                                </View>
                                {porcentaje === 100 && (
                                    <Text style={estilos.entrenoCompleto}>🎉 ¡Entreno completado!</Text>
                                )}
                            </View>
                        )}

                        {/* Lista de ejercicios */}
                        {diaData?.ejercicios.map((ejercicio, i) => {
                            const clave = `${diaActivo}_${ejercicio.nombre}`;
                            const completado = !!ejerciciosCompletados[clave];
                            const guardando = guardandoEjercicio === clave;

                            return (
                                <View key={i} style={[estilos.ejercicioCard, completado && estilos.ejercicioCardCompleto]}>
                                    <View style={estilos.ejercicioContenido}>

                                        {/* Imagen del ejercicio */}
                                        {ejercicio.imagen && (
                                            <Image
                                                source={{ uri: ejercicio.imagen }}
                                                style={estilos.ejercicioImagen}
                                                resizeMode="cover"
                                            />
                                        )}
                                        {!ejercicio.imagen && (
                                            <View style={estilos.ejercicioImagenPlaceholder}>
                                                <Text style={estilos.ejercicioImagenEmoji}>💪</Text>
                                            </View>
                                        )}

                                        {/* Info */}
                                        <View style={estilos.ejercicioInfo}>
                                            <Text style={[estilos.ejercicioNombre, completado && estilos.textoTachado]} numberOfLines={2}>
                                                {ejercicio.nombre}
                                            </Text>
                                            <View style={estilos.ejercicioStats}>
                                                {ejercicio.series && (
                                                    <View style={estilos.statChip}>
                                                        <Text style={estilos.statValor}>{ejercicio.series}</Text>
                                                        <Text style={estilos.statLabel}>series</Text>
                                                    </View>
                                                )}
                                                {ejercicio.reps && (
                                                    <View style={estilos.statChip}>
                                                        <Text style={estilos.statValor}>{ejercicio.reps}</Text>
                                                        <Text style={estilos.statLabel}>reps</Text>
                                                    </View>
                                                )}
                                                {ejercicio.descanso && (
                                                    <View style={[estilos.statChip, { backgroundColor: '#1e3a2e' }]}>
                                                        <Text style={[estilos.statValor, { color: '#4ade80' }]}>⏱ {ejercicio.descanso}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {ejercicio.descripcion && (
                                                <Text style={estilos.ejercicioDescripcion} numberOfLines={2}>
                                                    {ejercicio.descripcion}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Checkbox */}
                                        <TouchableOpacity
                                            style={[estilos.checkbox, completado && estilos.checkboxActivo]}
                                            onPress={() => toggleEjercicio(ejercicio.nombre, ejercicio)}
                                            disabled={guardando}
                                        >
                                            {guardando
                                                ? <ActivityIndicator size="small" color="#fff" />
                                                : <Text style={estilos.checkboxTexto}>{completado ? '✓' : ''}</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}

                        <View style={{ height: 40 }} />
                    </>
                )}

                {/* Sin rutina */}
                {!rutina && !cargando && (
                    <View style={estilos.vacio}>
                        <Text style={estilos.vacioIcono}>🏋️</Text>
                        <Text style={estilos.vacioTitulo}>Sin rutina generada</Text>
                        <Text style={estilos.vacioTexto}>
                            Toca el botón de arriba y la IA creará una rutina personalizada según tu perfil
                        </Text>
                    </View>
                )}

            </ScrollView>
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
    selectorVista: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 20, padding: 3 },
    vistaBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 18 },
    vistaBtnActivo: { backgroundColor: '#2563eb' },
    vistaBtnTexto: { color: '#666', fontSize: 13, fontWeight: '600' },
    botonGenerar: {
        backgroundColor: '#2563eb', borderRadius: 14, margin: 20,
        padding: 16, alignItems: 'center',
    },
    botonDesactivado: { opacity: 0.6 },
    botonGenerarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cargandoTexto: { color: '#555', textAlign: 'center', fontSize: 13, marginTop: -10, marginBottom: 16 },
    diasScroll: { marginBottom: 16 },
    diaBtn: {
        borderWidth: 1, borderColor: '#2563eb40', borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 16, marginRight: 8,
    },
    diaBtnActivo: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    diaBtnCompleto: { borderColor: '#16a34a' },
    diaBtnTexto: { color: '#666', fontSize: 13, fontWeight: '600' },
    diaHeaderCard: {
        backgroundColor: '#1a1a2e', borderRadius: 14, marginHorizontal: 20,
        marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#2563eb20',
    },
    diaHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    diaTitulo: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
    diaProgreso: { color: '#2563eb', fontSize: 14, fontWeight: '700' },
    barraFondo: { height: 6, backgroundColor: '#0a0a1a', borderRadius: 3, overflow: 'hidden' },
    barraRelleno: { height: 6, backgroundColor: '#2563eb', borderRadius: 3 },
    entrenoCompleto: { color: '#4ade80', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },
    ejercicioCard: {
        backgroundColor: '#1a1a2e', borderRadius: 14, marginHorizontal: 20,
        marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#2563eb10',
    },
    ejercicioCardCompleto: { borderColor: '#16a34a30', opacity: 0.75 },
    ejercicioContenido: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    ejercicioImagen: { width: 70, height: 70, borderRadius: 10, marginRight: 12, backgroundColor: '#0a0a1a' },
    ejercicioImagenPlaceholder: {
        width: 70, height: 70, borderRadius: 10, marginRight: 12,
        backgroundColor: '#0d0d20', justifyContent: 'center', alignItems: 'center',
    },
    ejercicioImagenEmoji: { fontSize: 28 },
    ejercicioInfo: { flex: 1 },
    ejercicioNombre: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    textoTachado: { textDecorationLine: 'line-through', color: '#555' },
    ejercicioStats: { flexDirection: 'row', flexWrap: 'wrap' },
    statChip: {
        backgroundColor: '#0d0d25', borderRadius: 8,
        paddingVertical: 4, paddingHorizontal: 8, marginRight: 6, marginBottom: 4,
        flexDirection: 'row', alignItems: 'center',
    },
    statValor: { color: '#2563eb', fontSize: 13, fontWeight: '800', marginRight: 3 },
    statLabel: { color: '#555', fontSize: 11 },
    ejercicioDescripcion: { color: '#555', fontSize: 11, marginTop: 4, lineHeight: 16 },
    checkbox: {
        width: 32, height: 32, borderRadius: 16, borderWidth: 2,
        borderColor: '#2563eb40', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    checkboxActivo: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    checkboxTexto: { color: '#fff', fontSize: 16, fontWeight: '900' },
    vacio: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
    vacioIcono: { fontSize: 50, marginBottom: 16 },
    vacioTitulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    vacioTexto: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});