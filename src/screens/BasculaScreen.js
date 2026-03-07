import { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function BasculaScreen({ navigation }) {
    const [imagen, setImagen] = useState(null);
    const [imagenBase64, setImagenBase64] = useState(null);
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    async function seleccionarImagen() {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
            base64: true,
        });

        if (!resultado.canceled) {
            setImagen(resultado.assets[0].uri);
            setImagenBase64(resultado.assets[0].base64);
            setDatos(null);
        }
    }

    async function tomarFoto() {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara');
            return;
        }

        const resultado = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
            base64: true,
        });

        if (!resultado.canceled) {
            setImagen(resultado.assets[0].uri);
            setImagenBase64(resultado.assets[0].base64);
            setDatos(null);
        }
    }

    async function analizarImagen() {
        if (!imagenBase64) {
            Alert.alert('Error', 'Selecciona una imagen primero');
            return;
        }

        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.post(
                `${API_URL}/medidas/leer-bascula.php`,
                {
                    imagen_base64: imagenBase64,
                    tipo_imagen: 'image/jpeg'
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 60000
                }
            );
            setDatos(respuesta.data.datos);
        } catch (error) {
            const mensaje = error.response?.data?.error || 'Error al analizar la imagen';
            Alert.alert('Error', mensaje);
        } finally {
            setCargando(false);
        }
    }

    async function guardarMedidas() {
        if (!datos) return;
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/medidas/guardar-medidas.php`,
                { ...datos, fuente: 'foto_bascula' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('✅ Guardado', 'Tus medidas se guardaron correctamente', [
                { text: 'OK', onPress: () => {
                    setImagen(null);
                    setImagenBase64(null);
                    setDatos(null);
                }}
            ]);
        } catch (error) {
            Alert.alert('Error', 'No se pudieron guardar las medidas');
        } finally {
            setGuardando(false);
        }
    }

    function FilaDato({ etiqueta, valor, unidad }) {
        if (!valor) return null;
        return (
            <View style={estilos.fila}>
                <Text style={estilos.filaEtiqueta}>{etiqueta}</Text>
                <Text style={estilos.filaValor}>{valor} <Text style={estilos.filaUnidad}>{unidad}</Text></Text>
            </View>
        );
    }

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>📸 Leer Báscula</Text>
                <Text style={estilos.headerSubtitulo}>Sube la foto de tu informe Fitdays</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Área de imagen */}
                <View style={estilos.imagenContenedor}>
                    {imagen ? (
                        <Image source={{ uri: imagen }} style={estilos.imagen} resizeMode="contain" />
                    ) : (
                        <View style={estilos.imagenVacia}>
                            <Text style={estilos.imagenVaciaIcono}>📊</Text>
                            <Text style={estilos.imagenVaciaTexto}>
                                Sube la captura de tu báscula inteligente
                            </Text>
                        </View>
                    )}
                </View>

                {/* Botones de selección */}
                <View style={estilos.botonesImagen}>
                    <TouchableOpacity style={estilos.botonImagen} onPress={tomarFoto}>
                        <Text style={estilos.botonImagenTexto}>📷 Cámara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.botonImagen} onPress={seleccionarImagen}>
                        <Text style={estilos.botonImagenTexto}>🖼️ Galería</Text>
                    </TouchableOpacity>
                </View>

                {/* Botón analizar */}
                {imagen && !datos && (
                    <TouchableOpacity
                        style={[estilos.botonAnalizar, cargando && estilos.botonDesactivado]}
                        onPress={analizarImagen}
                        disabled={cargando}
                    >
                        {cargando ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={[estilos.botonAnalizarTexto, { marginLeft: 10 }]}>
                                    Analizando con IA...
                                </Text>
                            </View>
                        ) : (
                            <Text style={estilos.botonAnalizarTexto}>🤖 Analizar imagen</Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Datos extraídos */}
                {datos && (
                    <View style={estilos.datosContenedor}>
                        <Text style={estilos.datosTitulo}>✅ Datos extraídos</Text>

                        <View style={estilos.tarjeta}>
                            <Text style={estilos.tarjetaTitulo}>Composición corporal</Text>
                            <FilaDato etiqueta="Peso" valor={datos.peso_kg} unidad="kg" />
                            <FilaDato etiqueta="Grasa corporal" valor={datos.grasa_corporal} unidad="%" />
                            <FilaDato etiqueta="Masa muscular" valor={datos.masa_muscular} unidad="kg" />
                            <FilaDato etiqueta="Masa esquelética" valor={datos.masa_esqueletica} unidad="kg" />
                            <FilaDato etiqueta="Agua corporal" valor={datos.contenido_agua} unidad="%" />
                            <FilaDato etiqueta="IMC" valor={datos.imc} unidad="kg/m²" />
                        </View>

                        <View style={estilos.tarjeta}>
                            <Text style={estilos.tarjetaTitulo}>Otros indicadores</Text>
                            <FilaDato etiqueta="Grasa visceral" valor={datos.grasa_visceral} unidad="" />
                            <FilaDato etiqueta="Metabolismo basal" valor={datos.metabolismo_basal} unidad="kcal" />
                            <FilaDato etiqueta="Puntuación" valor={datos.puntuacion_corporal} unidad="/100" />
                            <FilaDato etiqueta="Edad corporal" valor={datos.edad_corporal} unidad="años" />
                        </View>

                        <TouchableOpacity
                            style={[estilos.botonGuardar, guardando && estilos.botonDesactivado]}
                            onPress={guardarMedidas}
                            disabled={guardando}
                        >
                            {guardando
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={estilos.botonGuardarTexto}>💾 Guardar medidas</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
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
    headerSubtitulo: { color: '#555', fontSize: 13, marginTop: 4 },
    imagenContenedor: {
        margin: 20,
        height: 250,
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2563eb20',
    },
    imagen: { width: '100%', height: '100%' },
    imagenVacia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imagenVaciaIcono: { fontSize: 50, marginBottom: 12 },
    imagenVaciaTexto: { color: '#444', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
    botonesImagen: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    botonImagen: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2563eb30',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    botonImagenTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
    botonAnalizar: {
        backgroundColor: '#2563eb',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    botonDesactivado: { opacity: 0.6 },
    botonAnalizarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    datosContenedor: { paddingHorizontal: 20 },
    datosTitulo: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    tarjeta: {
        backgroundColor: '#1a1a2e',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2563eb15',
    },
    tarjetaTitulo: { color: '#2563eb', fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ffffff08',
    },
    filaEtiqueta: { color: '#888', fontSize: 13 },
    filaValor: { color: '#fff', fontSize: 13, fontWeight: '600' },
    filaUnidad: { color: '#555', fontSize: 11 },
    botonGuardar: {
        backgroundColor: '#16a34a',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    botonGuardarTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
});