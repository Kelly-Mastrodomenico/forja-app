import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config/api';

export default function PerfilScreen({ navigation }) {
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [nombre, setNombre] = useState('');
    const [alturaCm, setAlturaCm] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [diasEntrenamiento, setDiasEntrenamiento] = useState('');
    const [nivel, setNivel] = useState('');
    const [tieneCiclo, setTieneCiclo] = useState(false);
    const [duracionCiclo, setDuracionCiclo] = useState('28');
    const [pesoObjetivo, setPesoObjetivo] = useState('');
const [grasaObjetivo, setGrasaObjetivo] = useState('');
    const [patologias, setPatologias] = useState(['ninguna']);

    useFocusEffect(
        useCallback(() => {
            cargarPerfil();
        }, [])
    );

    async function cargarPerfil() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.get(`${API_URL}/usuario/perfil.php`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const datos = respuesta.data;
            setPerfil(datos);
            setNombre(datos.nombre || '');
            setAlturaCm(String(datos.altura_cm || ''));
            setObjetivo(datos.objetivo || '');
            setDiasEntrenamiento(String(datos.dias_entrenamiento || ''));
            setNivel(datos.nivel || '');
            setTieneCiclo(datos.tiene_ciclo == 1);
            setDuracionCiclo(String(datos.duracion_ciclo || '28'));
            setPesoObjetivo(String(datos.peso_objetivo || ''));
setGrasaObjetivo(String(datos.grasa_objetivo || ''));
            setPatologias(datos.patologias || ['ninguna']);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar el perfil');
        } finally {
            setCargando(false);
        }
    }

    async function guardarPerfil() {
        if (!nombre.trim() || !alturaCm || !objetivo || !diasEntrenamiento || !nivel) {
            Alert.alert('Error', 'Completa todos los campos');
            return;
        }
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(`${API_URL}/usuario/perfil.php`, {
                nombre: nombre.trim(),
                altura_cm: parseFloat(alturaCm),
                objetivo,
                peso_objetivo: pesoObjetivo ? parseFloat(pesoObjetivo) : null,
grasa_objetivo: grasaObjetivo ? parseFloat(grasaObjetivo) : null,
                dias_entrenamiento: parseInt(diasEntrenamiento),
                nivel,
                tiene_ciclo: tieneCiclo,
                duracion_ciclo: parseInt(duracionCiclo),
                patologias
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Actualizar AsyncStorage
            const usuarioGuardado = await AsyncStorage.getItem('forja_usuario');
            if (usuarioGuardado) {
                const usuarioObj = JSON.parse(usuarioGuardado);
                usuarioObj.nombre = nombre.trim();
                usuarioObj.objetivo = objetivo;
                usuarioObj.nivel = nivel;
                await AsyncStorage.setItem('forja_usuario', JSON.stringify(usuarioObj));
            }

            setEditando(false);
            cargarPerfil();
            Alert.alert('✅', 'Perfil actualizado correctamente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar el perfil');
        } finally {
            setGuardando(false);
        }
    }

    async function cerrarSesion() {
        Alert.alert('Cerrar sesión', '¿Estás segura?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Salir', style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('forja_usuario');
                    await AsyncStorage.removeItem('forja_token');
                    navigation.replace('Login');
                }
            }
        ]);
    }

    function togglePatologia(pat) {
        if (pat === 'ninguna') { setPatologias(['ninguna']); return; }
        let nuevas = patologias.filter(p => p !== 'ninguna');
        if (nuevas.includes(pat)) {
            nuevas = nuevas.filter(p => p !== pat);
        } else {
            nuevas.push(pat);
        }
        setPatologias(nuevas.length === 0 ? ['ninguna'] : nuevas);
    }

    function Opcion({ valor, seleccionado, onPress, texto }) {
        return (
            <TouchableOpacity
                style={[estilos.opcion, seleccionado && estilos.opcionActiva]}
                onPress={onPress}
            >
                <Text style={[estilos.opcionTexto, seleccionado && estilos.opcionTextoActivo]}>
                    {texto}
                </Text>
            </TouchableOpacity>
        );
    }

    if (cargando) {
        return (
            <View style={estilos.centrado}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const objetivoTexto = {
        perder_grasa: '🔥 Perder grasa',
        ganar_musculo: '💪 Ganar músculo',
        recomposicion: '⚡ Recomposición',
        mantenimiento: '✅ Mantenimiento',
    };

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>Mi Perfil</Text>
                <TouchableOpacity onPress={() => setEditando(!editando)}>
                    <Text style={estilos.headerBoton}>{editando ? 'Cancelar' : '✏️ Editar'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Avatar y nombre */}
                <View style={estilos.avatarContenedor}>
                    <View style={estilos.avatar}>
                        <Text style={estilos.avatarTexto}>
                            {perfil?.nombre?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={estilos.avatarNombre}>{perfil?.nombre}</Text>
                    <Text style={estilos.avatarEmail}>{perfil?.email}</Text>
                </View>

                {/* Última medida */}
                {perfil?.ultima_medida && (
                    <View style={estilos.medidaCard}>
                        <Text style={estilos.medidaCardTitulo}>Última medición — {perfil.ultima_medida.fecha}</Text>
                        <View style={estilos.medidaGrid}>
                            <View style={estilos.medidaItem}>
                                <Text style={estilos.medidaValor}>{perfil.ultima_medida.peso_kg}</Text>
                                <Text style={estilos.medidaEtiqueta}>kg</Text>
                            </View>
                            <View style={estilos.medidaItem}>
                                <Text style={estilos.medidaValor}>{perfil.ultima_medida.grasa_corporal}%</Text>
                                <Text style={estilos.medidaEtiqueta}>Grasa</Text>
                            </View>
                            <View style={estilos.medidaItem}>
                                <Text style={estilos.medidaValor}>{perfil.ultima_medida.masa_muscular}</Text>
                                <Text style={estilos.medidaEtiqueta}>Músculo kg</Text>
                            </View>
                            <View style={estilos.medidaItem}>
                                <Text style={estilos.medidaValor}>{perfil.ultima_medida.imc}</Text>
                                <Text style={estilos.medidaEtiqueta}>IMC</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Modo vista */}
                {!editando && (
                    <View style={estilos.seccion}>
                        {[
                            { etiqueta: 'Objetivo', valor: objetivoTexto[perfil?.objetivo] },
                            { etiqueta: 'Nivel', valor: perfil?.nivel },
                            { etiqueta: 'Altura', valor: `${perfil?.altura_cm} cm` },
                            { etiqueta: 'Peso objetivo', valor: perfil?.peso_objetivo ? `${perfil.peso_objetivo} kg` : 'No definido' },
{ etiqueta: 'Grasa objetivo', valor: perfil?.grasa_objetivo ? `${perfil.grasa_objetivo}%` : 'No definido' },
                            { etiqueta: 'Días de entrenamiento', valor: `${perfil?.dias_entrenamiento} días/semana` },
                            { etiqueta: 'Ciclo menstrual', valor: perfil?.tiene_ciclo == 1 ? `Sí (${perfil?.duracion_ciclo} días)` : 'No' },
                            { etiqueta: 'Condiciones', valor: (perfil?.patologias || []).join(', ') },
                        ].map((item, i) => (
                            <View key={i} style={estilos.filaInfo}>
                                <Text style={estilos.filaEtiqueta}>{item.etiqueta}</Text>
                                <Text style={estilos.filaValor} numberOfLines={1}>{item.valor}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Modo edición */}
                {editando && (
                    <View style={estilos.seccion}>
                        <Text style={estilos.etiqueta}>Nombre</Text>
                        <TextInput style={estilos.input} value={nombre}
                            onChangeText={setNombre} placeholderTextColor="#555" />

                        <Text style={estilos.etiqueta}>Altura (cm)</Text>
                        <TextInput style={estilos.input} value={alturaCm}
                            onChangeText={setAlturaCm} keyboardType="numeric" placeholderTextColor="#555" />

                        <Text style={estilos.etiqueta}>Peso objetivo (kg)</Text>
<TextInput
    style={estilos.input}
    value={pesoObjetivo}
    onChangeText={setPesoObjetivo}
    keyboardType="numeric"
    placeholder="Ej: 52"
    placeholderTextColor="#555"
/>

<Text style={estilos.etiqueta}>% Grasa objetivo</Text>
<TextInput
    style={estilos.input}
    value={grasaObjetivo}
    onChangeText={setGrasaObjetivo}
    keyboardType="numeric"
    placeholder="Ej: 18"
    placeholderTextColor="#555"
/>

                        <Text style={estilos.etiqueta}>Objetivo</Text>
                        <View style={estilos.opciones}>
                            {[
                                { valor: 'perder_grasa', texto: '🔥 Perder grasa' },
                                { valor: 'ganar_musculo', texto: '💪 Ganar músculo' },
                                { valor: 'recomposicion', texto: '⚡ Recomposición' },
                                { valor: 'mantenimiento', texto: '✅ Mantenimiento' },
                            ].map(op => (
                                <Opcion key={op.valor} seleccionado={objetivo === op.valor}
                                    onPress={() => setObjetivo(op.valor)} texto={op.texto} />
                            ))}
                        </View>

                        <Text style={estilos.etiqueta}>Nivel</Text>
                        <View style={estilos.opciones}>
                            {['principiante', 'intermedio', 'avanzado'].map(n => (
                                <Opcion key={n} seleccionado={nivel === n}
                                    onPress={() => setNivel(n)}
                                    texto={n.charAt(0).toUpperCase() + n.slice(1)} />
                            ))}
                        </View>

                        <Text style={estilos.etiqueta}>Días de entrenamiento</Text>
                        <View style={estilos.opciones}>
                            {['2','3','4','5','6'].map(d => (
                                <Opcion key={d} seleccionado={diasEntrenamiento === d}
                                    onPress={() => setDiasEntrenamiento(d)} texto={d} />
                            ))}
                        </View>

                        <Text style={estilos.etiqueta}>¿Tienes ciclo menstrual?</Text>
                        <View style={estilos.opciones}>
                            <Opcion seleccionado={tieneCiclo === true}
                                onPress={() => setTieneCiclo(true)} texto="Sí" />
                            <Opcion seleccionado={tieneCiclo === false}
                                onPress={() => setTieneCiclo(false)} texto="No" />
                        </View>

                        {tieneCiclo && (
                            <>
                                <Text style={estilos.etiqueta}>Duración del ciclo (días)</Text>
                                <TextInput style={estilos.input} value={duracionCiclo}
                                    onChangeText={setDuracionCiclo} keyboardType="numeric"
                                    placeholderTextColor="#555" />
                            </>
                        )}

                        <Text style={estilos.etiqueta}>Condiciones de salud</Text>
                        <View style={estilos.opciones}>
                            {[
    { valor: 'ninguna', texto: 'Ninguna' },
    { valor: 'sop', texto: 'SOP' },
    { valor: 'hipotiroidismo', texto: 'Hipotiroidismo' },
    { valor: 'resistencia_insulina', texto: 'Res. Insulina' },
    { valor: 'endometriosis', texto: 'Endometriosis' },
    { valor: 'diabetes_tipo2', texto: 'Diabetes t2' },
    { valor: 'dolor_rodilla', texto: '🦵 Dolor rodilla' },
    { valor: 'dolor_lumbar', texto: '🔙 Dolor lumbar' },
    { valor: 'lesion_hombro', texto: '💪 Lesión hombro' },
    { valor: 'tendinitis', texto: '🩹 Tendinitis' },
].map(op => (
    <Opcion key={op.valor}
        seleccionado={patologias.includes(op.valor)}
        onPress={() => togglePatologia(op.valor)}
        texto={op.texto} />
))}
                        </View>

                        <TouchableOpacity
                            style={[estilos.botonGuardar, guardando && estilos.botonDesactivado]}
                            onPress={guardarPerfil}
                            disabled={guardando}
                        >
                            {guardando
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={estilos.botonGuardarTexto}>Guardar cambios</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cerrar sesión */}
                <TouchableOpacity style={estilos.botonSalir} onPress={cerrarSesion}>
                    <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    centrado: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 55, paddingBottom: 16, paddingHorizontal: 24,
        borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
    },
    headerTitulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerBoton: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
    avatarContenedor: { alignItems: 'center', paddingVertical: 30 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    avatarTexto: { color: '#fff', fontSize: 32, fontWeight: '900' },
    avatarNombre: { color: '#fff', fontSize: 20, fontWeight: '700' },
    avatarEmail: { color: '#555', fontSize: 13, marginTop: 4 },
    medidaCard: {
        backgroundColor: '#1a1a2e', borderRadius: 16, margin: 20,
        padding: 16, borderWidth: 1, borderColor: '#2563eb20',
    },
    medidaCardTitulo: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginBottom: 16 },
    medidaGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    medidaItem: { alignItems: 'center' },
    medidaValor: { color: '#fff', fontSize: 18, fontWeight: '800' },
    medidaEtiqueta: { color: '#555', fontSize: 11, marginTop: 4 },
    seccion: { paddingHorizontal: 20 },
    filaInfo: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
    },
    filaEtiqueta: { color: '#666', fontSize: 14 },
    filaValor: { color: '#fff', fontSize: 14, fontWeight: '600', textTransform: 'capitalize', maxWidth: '55%' },
    etiqueta: { color: '#aaa', fontSize: 12, letterSpacing: 1, marginTop: 20, marginBottom: 8 },
    input: {
        backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2563eb30',
        borderRadius: 12, padding: 14, color: '#fff', fontSize: 15,
    },
    opciones: { flexDirection: 'row', flexWrap: 'wrap' },
    opcion: {
        borderWidth: 1, borderColor: '#2563eb40', borderRadius: 10,
        paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 8,
    },
    opcionActiva: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    opcionTexto: { color: '#666', fontSize: 13 },
    opcionTextoActivo: { color: '#fff', fontWeight: '700' },
    botonGuardar: {
        backgroundColor: '#2563eb', borderRadius: 12,
        padding: 16, alignItems: 'center', marginTop: 24,
    },
    botonDesactivado: { opacity: 0.6 },
    botonGuardarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    botonSalir: {
        borderWidth: 1, borderColor: '#ef444430', borderRadius: 12,
        padding: 14, alignItems: 'center', margin: 20, marginTop: 30,
    },
    botonSalirTexto: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});