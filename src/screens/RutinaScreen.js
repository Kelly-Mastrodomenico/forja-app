import { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function RutinaScreen() {
    const [rutina, setRutina] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [tipoSeleccionado, setTipoSeleccionado] = useState('semanal');

    async function generarRutina() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            console.log('Token:', token);

            const respuesta = await axios.post(
    `${API_URL}/ia/generar-rutina.php`,
    { tipo: tipoSeleccionado },
    { headers: { Authorization: `Bearer ${token}` } }
);

console.log('Respuesta completa:', JSON.stringify(respuesta.data));
setRutina(respuesta.data);

        } catch (error) {
            const mensaje = error.response?.data?.error || 'Error al generar la rutina';
            Alert.alert('Error', mensaje);
        } finally {
            setCargando(false);
        }
    }

    function parsearSecciones(texto) {
        if (!texto) return [];
        const secciones = texto.split('##').filter(s => s.trim());
        return secciones.map(seccion => {
            const lineas = seccion.trim().split('\n');
            const titulo = lineas[0].trim();
            const contenido = lineas.slice(1).join('\n').trim();
            return { titulo, contenido };
        });
    }

    const secciones = rutina ? parsearSecciones(rutina.contenido) : [];

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>Mi Rutina</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={estilos.selectorContenedor}>
                    {['diaria', 'semanal', 'mensual'].map(tipo => (
                        <TouchableOpacity
                            key={tipo}
                            style={[estilos.selectorBtn, tipoSeleccionado === tipo && estilos.selectorBtnActivo]}
                            onPress={() => setTipoSeleccionado(tipo)}
                        >
                            <Text style={[estilos.selectorTexto, tipoSeleccionado === tipo && estilos.selectorTextoActivo]}>
                                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[estilos.botonGenerar, cargando && estilos.botonDesactivado]}
                    onPress={generarRutina}
                    disabled={cargando}
                >
                    {cargando ? (
                        <View style={estilos.cargandoContenedor}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={estilos.botonTexto}>  Generando con IA...</Text>
                        </View>
                    ) : (
                        <Text style={estilos.botonTexto}>
                            {rutina ? '🔄 Regenerar rutina' : '⚡ Generar mi rutina'}
                        </Text>
                    )}
                </TouchableOpacity>

                {secciones.length > 0 && (
                    <View style={estilos.resultadoContenedor}>
                        {secciones.map((seccion, index) => (
                            <View key={index} style={estilos.seccion}>
                                <View style={estilos.seccionHeader}>
                                    <Text style={estilos.seccionTitulo}>{seccion.titulo}</Text>
                                </View>
                                <Text style={estilos.seccionContenido}>{seccion.contenido}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {!rutina && !cargando && (
                    <View style={estilos.vacio}>
                        <Text style={estilos.vacioIcono}>🤖</Text>
                        <Text style={estilos.vacioTexto}>
                            Selecciona el tipo de plan y pulsa generar para que la IA cree tu rutina personalizada
                        </Text>
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    header: {
        paddingTop: 55,
        paddingBottom: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a2e',
    },
    headerTitulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
    selectorContenedor: {
        flexDirection: 'row',
        margin: 20,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 4,
    },
    selectorBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    selectorBtnActivo: { backgroundColor: '#2563eb' },
    selectorTexto: { color: '#666', fontSize: 13, fontWeight: '600' },
    selectorTextoActivo: { color: '#fff' },
    botonGenerar: {
        backgroundColor: '#2563eb',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
    },
    botonDesactivado: { opacity: 0.7 },
    botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cargandoContenedor: { flexDirection: 'row', alignItems: 'center' },
    resultadoContenedor: { margin: 20 },
    seccion: {
        backgroundColor: '#1a1a2e',
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2563eb20',
    },
    seccionHeader: {
        backgroundColor: '#2563eb15',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb20',
    },
    seccionTitulo: { color: '#2563eb', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    seccionContenido: { color: '#ccc', fontSize: 13, lineHeight: 22, padding: 16 },
    vacio: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
    vacioIcono: { fontSize: 50, marginBottom: 16 },
    vacioTexto: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});