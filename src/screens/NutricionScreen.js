import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Image, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const MOMENTOS = [
    { valor: 'desayuno', label: '🌅 Desayuno' },
    { valor: 'media_manana', label: '🍎 Media mañana' },
    { valor: 'almuerzo', label: '🍽️ Almuerzo' },
    { valor: 'merienda', label: '🥪 Merienda' },
    { valor: 'cena', label: '🌙 Cena' },
    { valor: 'pre_entreno', label: '⚡ Pre-entreno' },
    { valor: 'post_entreno', label: '💪 Post-entreno' },
];

export default function NutricionScreen() {
    const [diario, setDiario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [escaneando, setEscaneando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Datos del formulario
    const [etiquetaEscaneada, setEtiquetaEscaneada] = useState(null);
    const [nombreAlimento, setNombreAlimento] = useState('');
    const [marcaAlimento, setMarcaAlimento] = useState('');
    const [cantidadGramos, setCantidadGramos] = useState('100');
    const [momentoSeleccionado, setMomentoSeleccionado] = useState('almuerzo');

    useFocusEffect(
        useCallback(() => {
            cargarDiario();
        }, [])
    );

    async function cargarDiario() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const hoy = new Date().toISOString().split('T')[0];
            const respuesta = await axios.get(`${API_URL}/nutricion/diario.php?fecha=${hoy}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDiario(respuesta.data);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar el diario');
        } finally {
            setCargando(false);
        }
    }

    async function escanearEtiqueta(desdeGaleria = false) {
        let resultado;
        if (desdeGaleria) {
            const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permiso.granted) { Alert.alert('Permiso requerido'); return; }
            resultado = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8, base64: true,
            });
        } else {
            const permiso = await ImagePicker.requestCameraPermissionsAsync();
            if (!permiso.granted) { Alert.alert('Permiso requerido'); return; }
            resultado = await ImagePicker.launchCameraAsync({
                quality: 0.8, base64: true,
            });
        }

        if (resultado.canceled) return;

        setEscaneando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.post(
                `${API_URL}/nutricion/escanear-etiqueta.php`,
                { imagen_base64: resultado.assets[0].base64, tipo_imagen: 'image/jpeg' },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
            );
            const datos = respuesta.data.datos;
            setEtiquetaEscaneada(datos);
            setNombreAlimento(datos.nombre_producto || '');
            setMarcaAlimento(datos.marca || '');
            setModalVisible(true);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'No se pudo escanear la etiqueta');
        } finally {
            setEscaneando(false);
        }
    }

    async function registrarComida() {
        if (!nombreAlimento.trim() || !cantidadGramos) {
            Alert.alert('Error', 'Nombre y cantidad son obligatorios');
            return;
        }

        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/nutricion/registrar-comida.php`,
                {
                    nombre: nombreAlimento.trim(),
                    marca: marcaAlimento.trim(),
                    cantidad_gramos: parseFloat(cantidadGramos),
                    momento: momentoSeleccionado,
                    calorias_100g: etiquetaEscaneada?.calorias_100g,
                    proteinas_100g: etiquetaEscaneada?.proteinas_100g,
                    carbohidratos_100g: etiquetaEscaneada?.carbohidratos_100g,
                    grasas_100g: etiquetaEscaneada?.grasas_100g,
                    fibra_100g: etiquetaEscaneada?.fibra_100g,
                    es_escaneado: !!etiquetaEscaneada,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setModalVisible(false);
            setEtiquetaEscaneada(null);
            setNombreAlimento('');
            setMarcaAlimento('');
            setCantidadGramos('100');
            cargarDiario();
            Alert.alert('✅', 'Comida registrada correctamente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo registrar la comida');
        } finally {
            setGuardando(false);
        }
    }

    function calcularCalorias(comida) {
        if (!comida.calorias_100g || !comida.cantidad_gramos) return null;
        return Math.round((comida.calorias_100g * comida.cantidad_gramos) / 100);
    }

    if (cargando) {
        return (
            <View style={estilos.centrado}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <View>
                    <Text style={estilos.headerTitulo}>Nutrición</Text>
                    <Text style={estilos.headerFecha}>{hoy}</Text>
                </View>
                <TouchableOpacity
                    style={estilos.botonAgregar}
                    onPress={() => {
                        setEtiquetaEscaneada(null);
                        setNombreAlimento('');
                        setMarcaAlimento('');
                        setCantidadGramos('100');
                        setModalVisible(true);
                    }}
                >
                    <Text style={estilos.botonAgregarTexto}>+ Agregar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Resumen del día */}
                {diario?.totales && (
                    <View style={estilos.resumenCard}>
                        <Text style={estilos.resumenTitulo}>Totales del día</Text>
                        <View style={estilos.macrosGrid}>
                            <View style={estilos.macroItem}>
                                <Text style={estilos.macroValor}>{diario.totales.calorias}</Text>
                                <Text style={estilos.macroEtiqueta}>kcal</Text>
                            </View>
                            <View style={[estilos.macroItem, { borderLeftWidth: 1, borderLeftColor: '#ffffff10' }]}>
                                <Text style={[estilos.macroValor, { color: '#ef4444' }]}>{diario.totales.proteinas}g</Text>
                                <Text style={estilos.macroEtiqueta}>Proteína</Text>
                            </View>
                            <View style={[estilos.macroItem, { borderLeftWidth: 1, borderLeftColor: '#ffffff10' }]}>
                                <Text style={[estilos.macroValor, { color: '#f59e0b' }]}>{diario.totales.carbohidratos}g</Text>
                                <Text style={estilos.macroEtiqueta}>Carbos</Text>
                            </View>
                            <View style={[estilos.macroItem, { borderLeftWidth: 1, borderLeftColor: '#ffffff10' }]}>
                                <Text style={[estilos.macroValor, { color: '#16a34a' }]}>{diario.totales.grasas}g</Text>
                                <Text style={estilos.macroEtiqueta}>Grasas</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Escanear etiqueta */}
                <View style={estilos.escanearCard}>
                    <Text style={estilos.escanearTitulo}>📷 Escanear etiqueta nutricional</Text>
                    <Text style={estilos.escanearSub}>La IA lee los datos automáticamente</Text>
                    <View style={estilos.escanearBotones}>
                        <TouchableOpacity
                            style={[estilos.escanearBtn, escaneando && estilos.botonDesactivado]}
                            onPress={() => escanearEtiqueta(false)}
                            disabled={escaneando}
                        >
                            {escaneando
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={estilos.escanearBtnTexto}>📷 Cámara</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[estilos.escanearBtn, estilos.escanearBtnSecundario, escaneando && estilos.botonDesactivado]}
                            onPress={() => escanearEtiqueta(true)}
                            disabled={escaneando}
                        >
                            <Text style={estilos.escanearBtnTextoSecundario}>🖼️ Galería</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Comidas del día por momento */}
                {MOMENTOS.map(momento => {
                    const comidasMomento = (diario?.comidas || []).filter(c => c.momento === momento.valor);
                    if (comidasMomento.length === 0) return null;
                    return (
                        <View key={momento.valor} style={estilos.momentoContenedor}>
                            <Text style={estilos.momentoTitulo}>{momento.label}</Text>
                            {comidasMomento.map((comida, i) => (
                                <View key={i} style={estilos.comidaItem}>
                                    <View style={estilos.comidaInfo}>
                                        <Text style={estilos.comidaNombre}>{comida.nombre}</Text>
                                        {comida.marca && (
                                            <Text style={estilos.comidaMarca}>{comida.marca}</Text>
                                        )}
                                        <Text style={estilos.comidaCantidad}>{comida.cantidad_gramos}g</Text>
                                    </View>
                                    <View style={estilos.comidaCalorias}>
                                        {calcularCalorias(comida) && (
                                            <Text style={estilos.comidaCaloriasTexto}>
                                                {calcularCalorias(comida)} kcal
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}

                {diario?.comidas?.length === 0 && (
                    <View style={estilos.vacio}>
                        <Text style={estilos.vacioIcono}>🍽️</Text>
                        <Text style={estilos.vacioTexto}>Sin comidas registradas hoy</Text>
                        <Text style={estilos.vacioSub}>Toca "+ Agregar" o escanea una etiqueta</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal agregar comida */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={estilos.modalOverlay}>
                    <View style={estilos.modalContenido}>
                        <View style={estilos.modalHeader}>
                            <Text style={estilos.modalTitulo}>
                                {etiquetaEscaneada ? '✅ Etiqueta escaneada' : 'Agregar comida'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={estilos.modalCerrar}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>

                            {/* Alerta de ingredientes */}
                            {etiquetaEscaneada?.alertas && (
                                <View style={estilos.alerta}>
                                    <Text style={estilos.alertaTexto}>
                                        ⚠️ Ingredientes a considerar: {etiquetaEscaneada.alertas}
                                    </Text>
                                </View>
                            )}

                            {/* Info nutricional escaneada */}
                            {etiquetaEscaneada && (
                                <View style={estilos.infoEscaneada}>
                                    <Text style={estilos.infoEscanadaTitulo}>Por 100g:</Text>
                                    <View style={estilos.infoGrid}>
                                        {[
                                            { label: 'Calorías', valor: etiquetaEscaneada.calorias_100g, unidad: 'kcal' },
                                            { label: 'Proteínas', valor: etiquetaEscaneada.proteinas_100g, unidad: 'g' },
                                            { label: 'Carbos', valor: etiquetaEscaneada.carbohidratos_100g, unidad: 'g' },
                                            { label: 'Grasas', valor: etiquetaEscaneada.grasas_100g, unidad: 'g' },
                                        ].filter(i => i.valor).map((item, i) => (
                                            <View key={i} style={estilos.infoItem}>
                                                <Text style={estilos.infoValor}>{item.valor}{item.unidad}</Text>
                                                <Text style={estilos.infoEtiqueta}>{item.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <Text style={estilos.inputEtiqueta}>Nombre del alimento</Text>
                            <TextInput
                                style={estilos.input}
                                value={nombreAlimento}
                                onChangeText={setNombreAlimento}
                                placeholder="Ej: Pechuga de pollo"
                                placeholderTextColor="#555"
                            />

                            <Text style={estilos.inputEtiqueta}>Marca (opcional)</Text>
                            <TextInput
                                style={estilos.input}
                                value={marcaAlimento}
                                onChangeText={setMarcaAlimento}
                                placeholder="Ej: Zenú"
                                placeholderTextColor="#555"
                            />

                            <Text style={estilos.inputEtiqueta}>Cantidad (gramos)</Text>
                            <TextInput
                                style={estilos.input}
                                value={cantidadGramos}
                                onChangeText={setCantidadGramos}
                                keyboardType="numeric"
                                placeholderTextColor="#555"
                            />

                            <Text style={estilos.inputEtiqueta}>Momento del día</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                {MOMENTOS.map(m => (
                                    <TouchableOpacity
                                        key={m.valor}
                                        style={[estilos.momentoBtn, momentoSeleccionado === m.valor && estilos.momentoBtnActivo]}
                                        onPress={() => setMomentoSeleccionado(m.valor)}
                                    >
                                        <Text style={[estilos.momentoBtnTexto, momentoSeleccionado === m.valor && { color: '#fff' }]}>
                                            {m.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={[estilos.botonGuardar, guardando && estilos.botonDesactivado]}
                                onPress={registrarComida}
                                disabled={guardando}
                            >
                                {guardando
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={estilos.botonGuardarTexto}>💾 Guardar comida</Text>
                                }
                            </TouchableOpacity>

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    headerFecha: { color: '#555', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
    botonAgregar: {
        backgroundColor: '#2563eb', borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 16,
    },
    botonAgregarTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },
    resumenCard: {
        backgroundColor: '#1a1a2e', borderRadius: 16, margin: 20,
        padding: 16, borderWidth: 1, borderColor: '#2563eb20',
    },
    resumenTitulo: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginBottom: 12 },
    macrosGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    macroItem: { alignItems: 'center', flex: 1 },
    macroValor: { color: '#fff', fontSize: 18, fontWeight: '800' },
    macroEtiqueta: { color: '#555', fontSize: 11, marginTop: 4 },
    escanearCard: {
        backgroundColor: '#1a1a2e', borderRadius: 16, marginHorizontal: 20,
        marginBottom: 20, padding: 16, borderWidth: 1, borderColor: '#2563eb20',
    },
    escanearTitulo: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
    escanearSub: { color: '#555', fontSize: 12, marginBottom: 12 },
    escanearBotones: { flexDirection: 'row' },
    escanearBtn: {
        backgroundColor: '#2563eb', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 16, marginRight: 8,
        alignItems: 'center', flex: 1,
    },
    escanearBtnSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2563eb' },
    escanearBtnTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
    escanearBtnTextoSecundario: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
    botonDesactivado: { opacity: 0.6 },
    momentoContenedor: { paddingHorizontal: 20, marginBottom: 16 },
    momentoTitulo: { color: '#aaa', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    comidaItem: {
        backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
        marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#2563eb10',
    },
    comidaInfo: { flex: 1 },
    comidaNombre: { color: '#fff', fontSize: 14, fontWeight: '600' },
    comidaMarca: { color: '#555', fontSize: 12, marginTop: 2 },
    comidaCantidad: { color: '#2563eb', fontSize: 12, marginTop: 4 },
    comidaCalorias: { alignItems: 'flex-end', justifyContent: 'center' },
    comidaCaloriasTexto: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
    vacio: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40 },
    vacioIcono: { fontSize: 40, marginBottom: 12 },
    vacioTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
    vacioSub: { color: '#555', fontSize: 13, marginTop: 6, textAlign: 'center' },
    modalOverlay: {
        flex: 1, backgroundColor: '#000000aa',
        justifyContent: 'flex-end',
    },
    modalContenido: {
        backgroundColor: '#0f0f1f', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
    },
    modalTitulo: { color: '#fff', fontSize: 18, fontWeight: '800' },
    modalCerrar: { color: '#666', fontSize: 20, padding: 4 },
    alerta: {
        backgroundColor: '#ef444420', borderRadius: 10,
        padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ef444440',
    },
    alertaTexto: { color: '#ef4444', fontSize: 13, lineHeight: 20 },
    infoEscaneada: {
        backgroundColor: '#1a1a2e', borderRadius: 12,
        padding: 14, marginBottom: 16,
    },
    infoEscanadaTitulo: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginBottom: 10 },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    infoItem: { alignItems: 'center' },
    infoValor: { color: '#fff', fontSize: 15, fontWeight: '700' },
    infoEtiqueta: { color: '#555', fontSize: 11, marginTop: 2 },
    inputEtiqueta: { color: '#aaa', fontSize: 12, letterSpacing: 1, marginTop: 14, marginBottom: 6 },
    input: {
        backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2563eb30',
        borderRadius: 12, padding: 14, color: '#fff', fontSize: 15,
    },
    momentoBtn: {
        borderWidth: 1, borderColor: '#2563eb40', borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginTop: 8,
    },
    momentoBtnActivo: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    momentoBtnTexto: { color: '#666', fontSize: 12 },
    botonGuardar: {
        backgroundColor: '#2563eb', borderRadius: 12,
        padding: 16, alignItems: 'center', marginTop: 20,
    },
    botonGuardarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
});