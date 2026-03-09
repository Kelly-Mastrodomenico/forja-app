import { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Image, TextInput, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import HeaderForja from '../components/HeaderForja';

const FONDO   = '#0a0a0a';
const CARD    = '#111111';
const CARD2   = '#1a1a1a';
const BORDE   = '#2a2a2a';
const AZUL    = '#3b82f6';
const NARANJA = '#f97316';
const TEXTO   = '#ffffff';
const SUBTXT  = '#6b7280';
const VERDE   = '#22c55e';
const ROJO    = '#ef4444';

export default function EscanearEtiqueta({ navigation }) {
    const [imagen, setImagen]           = useState(null);       // uri local
    const [base64, setBase64]           = useState(null);
    const [analizando, setAnalizando]   = useState(false);
    const [datos, setDatos]             = useState(null);       // resultado IA
    const [guardando, setGuardando]     = useState(false);
    const [guardado, setGuardado]       = useState(false);

    // Campos editables antes de guardar
    const [nombre, setNombre]   = useState('');
    const [marca, setMarca]     = useState('');
    const [modalEditar, setModalEditar] = useState(false);

    // ── Abrir cámara ──────────────────────────────────────────────────────
    async function abrirCamara() {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
            return;
        }
        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality:    0.8,
            base64:     true,
        });
        if (!res.canceled && res.assets?.[0]) {
            setImagen(res.assets[0].uri);
            setBase64(res.assets[0].base64);
            setDatos(null);
            setGuardado(false);
            analizarEtiqueta(res.assets[0].base64, res.assets[0].mimeType || 'image/jpeg');
        }
    }

    // ── Abrir galería ─────────────────────────────────────────────────────
    async function abrirGaleria() {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality:    0.8,
            base64:     true,
        });
        if (!res.canceled && res.assets?.[0]) {
            setImagen(res.assets[0].uri);
            setBase64(res.assets[0].base64);
            setDatos(null);
            setGuardado(false);
            analizarEtiqueta(res.assets[0].base64, res.assets[0].mimeType || 'image/jpeg');
        }
    }

    // ── Llamar al backend de análisis ─────────────────────────────────────
    async function analizarEtiqueta(b64, tipoImagen) {
        setAnalizando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.post(
                `${API_URL}/nutricion/escanear-etiqueta.php`,
                { imagen_base64: b64, tipo_imagen: tipoImagen },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 }
            );
            if (resp.data?.datos) {
                const d = resp.data.datos;
                setDatos(d);
                setNombre(d.nombre_producto || '');
                setMarca(d.marca || '');
            } else {
                Alert.alert('Error', resp.data?.error || 'No se pudieron extraer los datos.');
            }
        } catch (e) {
            const msg = e.response?.data?.error || 'Error analizando la imagen.';
            Alert.alert('Error', msg);
        } finally {
            setAnalizando(false);
        }
    }

    // ── Guardar en tabla alimentos ────────────────────────────────────────
    async function guardarAlimento() {
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre del producto es requerido.');
            return;
        }
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/nutricion/guardar-alimento.php`,
                {
                    nombre:               nombre.trim(),
                    marca:                marca.trim() || null,
                    calorias_100g:        datos?.calorias_100g        ?? null,
                    proteinas_100g:       datos?.proteinas_100g       ?? null,
                    carbohidratos_100g:   datos?.carbohidratos_100g   ?? null,
                    azucares_100g:        datos?.azucares_100g        ?? null,
                    grasas_100g:          datos?.grasas_100g          ?? null,
                    grasas_saturadas_100g:datos?.grasas_saturadas_100g?? null,
                    fibra_100g:           datos?.fibra_100g           ?? null,
                    sodio_100g:           datos?.sodio_100g           ?? null,
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            setGuardado(true);
            Alert.alert(
                '✅ Guardado',
                `"${nombre}" añadido a tu biblioteca de alimentos. Ya puedes buscarlo al registrar comidas.`,
                [{ text: 'Volver a Nutrición', onPress: () => navigation.goBack() },
                 { text: 'Escanear otro', onPress: resetear }]
            );
        } catch (e) {
            const msg = e.response?.data?.error || 'No se pudo guardar el alimento.';
            Alert.alert('Error', msg);
        } finally {
            setGuardando(false);
        }
    }

    function resetear() {
        setImagen(null); setBase64(null);
        setDatos(null);  setGuardado(false);
        setNombre('');   setMarca('');
    }

    // ── Helpers de display ────────────────────────────────────────────────
    function val(v) {
        return v !== null && v !== undefined ? String(v) : '—';
    }

    return (
        <View style={estilos.contenedor}>
            <HeaderForja derecha={
                <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.volverBtn}>
                    <Text style={estilos.volverTxt}>✕ Cerrar</Text>
                </TouchableOpacity>
            } />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

                {/* ── TÍTULO ── */}
                <View style={estilos.titleBox}>
                    <Text style={estilos.titulo}>Escanear Etiqueta</Text>
                    <Text style={estilos.subtitulo}>La IA extrae automáticamente los valores nutricionales</Text>
                </View>

                {/* ── BOTONES FUENTE ── */}
                {!imagen && (
                    <View style={estilos.fuenteRow}>
                        <TouchableOpacity style={estilos.fuenteBtn} onPress={abrirCamara}>
                            <Text style={estilos.fuenteIcono}>📷</Text>
                            <Text style={estilos.fuenteTxt}>Cámara</Text>
                            <Text style={estilos.fuenteDesc}>Fotografía la etiqueta directamente</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={estilos.fuenteBtn} onPress={abrirGaleria}>
                            <Text style={estilos.fuenteIcono}>🖼️</Text>
                            <Text style={estilos.fuenteTxt}>Galería</Text>
                            <Text style={estilos.fuenteDesc}>Elige una foto existente</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── IMAGEN + ESTADO ── */}
                {imagen && (
                    <View style={estilos.imagenContenedor}>
                        <Image source={{ uri: imagen }} style={estilos.imagenPreview} resizeMode="contain" />
                        {!analizando && !datos && (
                            <TouchableOpacity style={estilos.cambiarImagenBtn} onPress={resetear}>
                                <Text style={estilos.cambiarImagenTxt}>Cambiar imagen</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── ANALIZANDO ── */}
                {analizando && (
                    <View style={estilos.analizandoBox}>
                        <ActivityIndicator color={AZUL} size="large" />
                        <Text style={estilos.analizandoTxt}>Analizando etiqueta con IA...</Text>
                        <Text style={estilos.analizandoSub}>Extrayendo valores nutricionales</Text>
                    </View>
                )}

                {/* ── RESULTADOS ── */}
                {datos && !analizando && (
                    <>
                        {/* Card nombre/marca editables */}
                        <View style={estilos.productoCard}>
                            <View style={estilos.productoHeader}>
                                <View style={estilos.productoIconBox}>
                                    <Text style={{ fontSize: 22 }}>🏷️</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.productoNombre} numberOfLines={2}>
                                        {nombre || 'Sin nombre'}
                                    </Text>
                                    {marca ? <Text style={estilos.productoMarca}>{marca}</Text> : null}
                                </View>
                                <TouchableOpacity
                                    style={estilos.editarBtn}
                                    onPress={() => setModalEditar(true)}
                                >
                                    <Text style={estilos.editarTxt}>✏️ Editar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Macros principales */}
                        <View style={estilos.macrosCard}>
                            <Text style={estilos.seccionTitulo}>VALORES POR 100g</Text>
                            <View style={estilos.macrosGrid}>
                                {[
                                    { icono: '🔥', label: 'Calorías',  val: datos.calorias_100g,      unidad: 'kcal', color: NARANJA },
                                    { icono: '🥩', label: 'Proteínas', val: datos.proteinas_100g,     unidad: 'g',    color: AZUL },
                                    { icono: '🌾', label: 'Carbos',    val: datos.carbohidratos_100g, unidad: 'g',    color: '#f59e0b' },
                                    { icono: '💧', label: 'Grasas',    val: datos.grasas_100g,        unidad: 'g',    color: '#a855f7' },
                                ].map((m, i) => (
                                    <View key={i} style={estilos.macroItem}>
                                        <Text style={estilos.macroIcono}>{m.icono}</Text>
                                        <Text style={[estilos.macroValor, { color: m.color }]}>
                                            {val(m.val)}
                                        </Text>
                                        <Text style={estilos.macroUnidad}>{m.unidad}</Text>
                                        <Text style={estilos.macroLabel}>{m.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Detalle completo */}
                        <View style={estilos.detalleCard}>
                            <Text style={estilos.seccionTitulo}>DETALLE COMPLETO</Text>
                            {[
                                { label: 'Azúcares',          v: datos.azucares_100g,         unidad: 'g' },
                                { label: 'Grasas saturadas',  v: datos.grasas_saturadas_100g, unidad: 'g' },
                                { label: 'Fibra',             v: datos.fibra_100g,            unidad: 'g' },
                                { label: 'Sodio',             v: datos.sodio_100g,            unidad: 'mg' },
                                { label: 'Porción',           v: datos.porcion_gramos,        unidad: 'g' },
                                { label: 'Kcal por porción',  v: datos.calorias_porcion,      unidad: 'kcal' },
                            ].map((item, i) => (
                                <View key={i} style={[estilos.detalleRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                                    <Text style={estilos.detalleLabel}>{item.label}</Text>
                                    <Text style={estilos.detalleValor}>
                                        {item.v !== null && item.v !== undefined ? `${item.v} ${item.unidad}` : '—'}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Ingredientes */}
                        {datos.ingredientes_destacados && (
                            <View style={estilos.ingredientesCard}>
                                <Text style={estilos.seccionTitulo}>INGREDIENTES PRINCIPALES</Text>
                                <Text style={estilos.ingredientesTxt}>{datos.ingredientes_destacados}</Text>
                            </View>
                        )}

                        {/* Alertas */}
                        {datos.alertas && (
                            <View style={estilos.alertaCard}>
                                <View style={estilos.alertaHeader}>
                                    <Text style={estilos.alertaIcono}>⚠️</Text>
                                    <Text style={estilos.alertaTitulo}>Ingredientes a evitar</Text>
                                </View>
                                <Text style={estilos.alertaTxt}>{datos.alertas}</Text>
                            </View>
                        )}

                        {/* Botones de acción */}
                        {!guardado ? (
                            <View style={estilos.accionesBox}>
                                <TouchableOpacity
                                    style={[estilos.btnGuardar, guardando && { opacity: 0.6 }]}
                                    onPress={guardarAlimento}
                                    disabled={guardando}
                                >
                                    {guardando
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <>
                                            <Text style={estilos.btnGuardarIcono}>💾</Text>
                                            <Text style={estilos.btnGuardarTxt}>Guardar en biblioteca</Text>
                                          </>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity style={estilos.btnReintentar} onPress={resetear}>
                                    <Text style={estilos.btnReintentarTxt}>Escanear otro</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={estilos.accionesBox}>
                                <View style={estilos.guardadoBadge}>
                                    <Text style={estilos.guardadoTxt}>✅ Guardado en tu biblioteca</Text>
                                </View>
                                <TouchableOpacity style={estilos.btnReintentar} onPress={resetear}>
                                    <Text style={estilos.btnReintentarTxt}>Escanear otro</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {/* ── TIPS (pantalla inicial) ── */}
                {!imagen && !analizando && (
                    <View style={estilos.tipsCard}>
                        <Text style={estilos.tipsTitulo}>💡 Consejos para mejor resultado</Text>
                        {[
                            'Encuadra solo la tabla nutricional',
                            'Buena iluminación, sin sombras',
                            'Foto nítida, sin movimiento',
                            'Si falla, prueba desde la galería',
                        ].map((t, i) => (
                            <View key={i} style={estilos.tipRow}>
                                <View style={estilos.tipDot} />
                                <Text style={estilos.tipTxt}>{t}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* ── MODAL EDITAR NOMBRE/MARCA ── */}
            <Modal visible={modalEditar} transparent animationType="slide">
                <TouchableOpacity
                    style={estilos.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalEditar(false)}
                >
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Editar producto</Text>
                        <Text style={estilos.inputLabel}>Nombre del producto</Text>
                        <TextInput
                            style={estilos.inputCampo}
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Ej: Avena molida integral"
                            placeholderTextColor={SUBTXT}
                        />
                        <Text style={estilos.inputLabel}>Marca (opcional)</Text>
                        <TextInput
                            style={estilos.inputCampo}
                            value={marca}
                            onChangeText={setMarca}
                            placeholder="Ej: Quaker, Hacendado..."
                            placeholderTextColor={SUBTXT}
                        />
                        <TouchableOpacity
                            style={estilos.modalBtn}
                            onPress={() => setModalEditar(false)}
                        >
                            <Text style={estilos.modalBtnTxt}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: FONDO },

    volverBtn: { backgroundColor: CARD2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: BORDE },
    volverTxt: { color: SUBTXT, fontSize: 13, fontWeight: '600' },

    titleBox:  { padding: 20, paddingBottom: 8 },
    titulo:    { color: TEXTO, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    subtitulo: { color: SUBTXT, fontSize: 13, lineHeight: 20 },

    // Fuentes
    fuenteRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8, marginBottom: 20 },
    fuenteBtn: { flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: BORDE, gap: 8 },
    fuenteIcono:{ fontSize: 36 },
    fuenteTxt: { color: TEXTO, fontSize: 16, fontWeight: '700' },
    fuenteDesc:{ color: SUBTXT, fontSize: 12, textAlign: 'center', lineHeight: 18 },

    // Imagen
    imagenContenedor: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDE },
    imagenPreview:    { width: '100%', height: 260, backgroundColor: CARD2 },
    cambiarImagenBtn: { backgroundColor: CARD2, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDE },
    cambiarImagenTxt: { color: SUBTXT, fontSize: 13, fontWeight: '600' },

    // Analizando
    analizandoBox: { padding: 40, alignItems: 'center', gap: 14 },
    analizandoTxt: { color: TEXTO, fontSize: 16, fontWeight: '700' },
    analizandoSub: { color: SUBTXT, fontSize: 13 },

    // Producto
    productoCard:   { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    productoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    productoIconBox:{ width: 44, height: 44, borderRadius: 12, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center' },
    productoNombre: { color: TEXTO, fontSize: 16, fontWeight: '800', marginBottom: 3 },
    productoMarca:  { color: SUBTXT, fontSize: 13 },
    editarBtn:      { backgroundColor: CARD2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: BORDE },
    editarTxt:      { color: AZUL, fontSize: 12, fontWeight: '600' },

    // Macros
    seccionTitulo: { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 14 },
    macrosCard:    { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    macrosGrid:    { flexDirection: 'row', justifyContent: 'space-between' },
    macroItem:     { alignItems: 'center', flex: 1 },
    macroIcono:    { fontSize: 22, marginBottom: 6 },
    macroValor:    { fontSize: 20, fontWeight: '800' },
    macroUnidad:   { color: SUBTXT, fontSize: 10, marginTop: -2 },
    macroLabel:    { color: SUBTXT, fontSize: 11, marginTop: 3 },

    // Detalle
    detalleCard:  { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    detalleRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    detalleLabel: { color: SUBTXT, fontSize: 13 },
    detalleValor: { color: TEXTO, fontSize: 13, fontWeight: '600' },

    // Ingredientes
    ingredientesCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    ingredientesTxt:  { color: SUBTXT, fontSize: 13, lineHeight: 22 },

    // Alertas
    alertaCard:   { marginHorizontal: 16, marginBottom: 10, backgroundColor: ROJO + '10', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: ROJO + '30' },
    alertaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertaIcono:  { fontSize: 18 },
    alertaTitulo: { color: ROJO, fontSize: 14, fontWeight: '700' },
    alertaTxt:    { color: '#fca5a5', fontSize: 13, lineHeight: 20 },

    // Acciones
    accionesBox:    { marginHorizontal: 16, marginTop: 8, gap: 10 },
    btnGuardar:     { backgroundColor: AZUL, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: AZUL, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    btnGuardarIcono:{ fontSize: 18 },
    btnGuardarTxt:  { color: '#fff', fontSize: 16, fontWeight: '700' },
    btnReintentar:  { paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: BORDE },
    btnReintentarTxt:{ color: SUBTXT, fontSize: 14, fontWeight: '600' },
    guardadoBadge:  { backgroundColor: VERDE + '15', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: VERDE + '40' },
    guardadoTxt:    { color: VERDE, fontSize: 15, fontWeight: '700' },

    // Tips
    tipsCard:   { marginHorizontal: 16, marginTop: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    tipsTitulo: { color: TEXTO, fontSize: 14, fontWeight: '700', marginBottom: 12 },
    tipRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    tipDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL },
    tipTxt:     { color: SUBTXT, fontSize: 13 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    bottomSheet:  { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDE },
    sheetHandle:  { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo:  { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 14 },
    inputLabel:   { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    inputCampo:   { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, borderRadius: 10, padding: 12, color: TEXTO, fontSize: 14, marginBottom: 12 },
    modalBtn:     { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
    modalBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});