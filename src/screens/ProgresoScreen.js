import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// ─── Colores ──────────────────────────────────────────────────────────────────
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

// ─── Card de métrica ──────────────────────────────────────────────────────────

function CardMetrica({ etiqueta, valor, unidad, delta, colorBarra }) {
    const esBaja    = delta && delta.startsWith('-');
    const esSubida  = delta && delta.startsWith('+');
    // Para grasa corporal, bajar es bueno
    const esGrasa   = etiqueta.toLowerCase().includes('grasa');
    const colorDelta = esGrasa
        ? (esBaja ? VERDE : ROJO)
        : (esSubida ? VERDE : ROJO);

    return (
        <View style={estilos.metricaCard}>
            <View style={[estilos.metricaBarra, { backgroundColor: colorBarra || AZUL }]} />
            <View style={estilos.metricaContenido}>
                <View style={estilos.metricaRow}>
                    <View>
                        <Text style={estilos.metricaEtiqueta}>{etiqueta}</Text>
                        <View style={estilos.metricaValorRow}>
                            <Text style={estilos.metricaValor}>{valor}</Text>
                            <Text style={estilos.metricaUnidad}> {unidad}</Text>
                        </View>
                    </View>
                    {delta && (
                        <View style={estilos.metricaDeltaCol}>
                            <View style={[estilos.metricaDeltaBadge, { backgroundColor: colorDelta + '15' }]}>
                                <Text style={[estilos.metricaDeltaIcono, { color: colorDelta }]}>
                                    {esBaja ? '↘' : '↗'}
                                </Text>
                                <Text style={[estilos.metricaDeltaTxt, { color: colorDelta }]}>{delta}</Text>
                            </View>
                            <Text style={estilos.metricaVsMes}>vs. mes pasado</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

// ─── Card de perímetro ────────────────────────────────────────────────────────

function CardPerimetro({ zona, valor, unidad = 'cm', delta }) {
    const esBaja   = delta && delta.startsWith('-');
    const colorD   = esBaja ? VERDE : NARANJA;

    return (
        <View style={estilos.perimetroCard}>
            <Text style={estilos.perimetroZona}>{zona}</Text>
            <View style={estilos.perimetroValorRow}>
                <Text style={estilos.perimetroValor}>{valor}</Text>
                <Text style={estilos.perimetroUnidad}> {unidad}</Text>
            </View>
            {delta && (
                <Text style={[estilos.perimetroDelta, { color: colorD }]}>
                    {delta}
                </Text>
            )}
        </View>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ProgresoScreen({ navigation }) {
    const [pestaña, setPestaña]         = useState('composicion');
    const [medidas, setMedidas]         = useState(null);
    const [perimetros, setPerimetros]   = useState(null);
    const [cargando, setCargando]       = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [modalRegistro, setModalRegistro] = useState(false);

    // Campos del modal
    const [pesoKg, setPesoKg]           = useState('');
    const [grasaPct, setGrasaPct]       = useState('');
    const [musculoKg, setMusculoKg]     = useState('');
    const [aguaPct, setAguaPct]         = useState('');
    const [guardando, setGuardando]     = useState(false);

    useFocusEffect(useCallback(() => { cargarMedidas(); }, []));

    async function cargarMedidas() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [rMedidas, rPerimetros] = await Promise.allSettled([
                axios.get(`${API_URL}/medidas/ultima-medida.php`,    { headers, timeout: 10000 }),
                axios.get(`${API_URL}/medidas/perimetros.php`,       { headers, timeout: 10000 }),
            ]);

            if (rMedidas.status    === 'fulfilled') setMedidas(rMedidas.value.data);
            if (rPerimetros.status === 'fulfilled') setPerimetros(rPerimetros.value.data);
        } catch (e) {
            console.log('Error medidas:', e.message);
        } finally {
            setCargando(false);
        }
    }

    async function subirFotoBáscula() {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
            return;
        }
        const resultado = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            base64: true,
        });
        if (resultado.canceled) return;

        setSincronizando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.post(
                `${API_URL}/medidas/leer-bascula-ia.php`,
                { imagen_base64: resultado.assets[0].base64 },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
            );
            if (resp.data?.peso_kg) {
                Alert.alert(
                    '📊 Datos detectados',
                    `Peso: ${resp.data.peso_kg} kg\nGrasa: ${resp.data.grasa_pct || '—'}%\nMúsculo: ${resp.data.musculo_kg || '—'} kg`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Guardar', onPress: () => guardarMedidaDirecta(resp.data) }
                    ]
                );
            } else {
                Alert.alert('Sin datos', 'No se pudieron leer los valores. Intenta con mejor iluminación.');
            }
        } catch (e) {
            Alert.alert('Error', 'No se pudo procesar la imagen.');
        } finally {
            setSincronizando(false);
        }
    }

    async function guardarMedidaDirecta(datos) {
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/medidas/guardar-medida.php`,
                { ...datos, fecha: new Date().toISOString().split('T')[0] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await cargarMedidas();
            Alert.alert('✅', 'Medida guardada correctamente.');
        } catch (e) {}
    }

    async function guardarManual() {
        if (!pesoKg.trim()) {
            Alert.alert('Error', 'El peso es requerido.');
            return;
        }
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/medidas/guardar-medida.php`,
                {
                    peso_kg:    parseFloat(pesoKg),
                    grasa_pct:  parseFloat(grasaPct) || null,
                    musculo_kg: parseFloat(musculoKg) || null,
                    agua_pct:   parseFloat(aguaPct) || null,
                    fecha:      new Date().toISOString().split('T')[0],
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setModalRegistro(false);
            setPesoKg(''); setGrasaPct(''); setMusculoKg(''); setAguaPct('');
            await cargarMedidas();
            Alert.alert('✅', 'Medida guardada correctamente.');
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar la medida.');
        } finally {
            setGuardando(false);
        }
    }

    // Datos de composición
    const pesoTotal     = medidas?.peso_kg     || null;
    const grasaCorp     = medidas?.grasa_pct   || null;
    const masaMusc      = medidas?.musculo_kg  || null;
    const deltaMusculo  = medidas?.delta_musculo || null;
    const deltaGrasa    = medidas?.delta_grasa   || null;
    const deltaPeso     = medidas?.delta_peso    || null;
    const actualizadoEn = medidas?.fecha ? `Actualizado hoy, ${new Date(medidas.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Sin datos recientes';

    // Progreso hacia meta
    const metaGrasa = medidas?.meta_grasa_pct || 12;
    const progMeta  = grasaCorp ? Math.max(0, Math.min(100, Math.round(((grasaCorp - metaGrasa) / (30 - metaGrasa)) * 100))) : 0;
    const pctCompletado = grasaCorp ? 100 - progMeta : 0;

    return (
        <View style={estilos.contenedor}>

            {/* ── HEADER ── */}
            <View style={estilos.header}>
                <View style={estilos.headerIzq}>
                    <View style={estilos.headerLogoBox}>
                        <Text style={estilos.headerLogo}>⚡</Text>
                    </View>
                    <Text style={estilos.headerTitulo}>Biometría</Text>
                </View>
                <TouchableOpacity onPress={cargarMedidas} style={estilos.refrescaBtn}>
                    <Text style={[estilos.refrescaIcono, cargando && { opacity: 0.4 }]}>🔄</Text>
                </TouchableOpacity>
            </View>

            {/* ── PESTAÑAS ── */}
            <View style={estilos.pestañasContenedor}>
                <TouchableOpacity
                    style={[estilos.pestañaTab, pestaña === 'composicion' && estilos.pestañaTabActiva]}
                    onPress={() => setPestaña('composicion')}
                >
                    <Text style={[estilos.pestañaTxt, pestaña === 'composicion' && estilos.pestañaTxtActivo]}>
                        Composición
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[estilos.pestañaTab, pestaña === 'perimetros' && estilos.pestañaTabActiva]}
                    onPress={() => setPestaña('perimetros')}
                >
                    <Text style={[estilos.pestañaTxt, pestaña === 'perimetros' && estilos.pestañaTxtActivo]}>
                        Perímetros
                    </Text>
                </TouchableOpacity>
            </View>

            {cargando ? (
                <View style={estilos.cargandoBox}>
                    <ActivityIndicator size="large" color={AZUL} />
                    <Text style={estilos.cargandoTxt}>Cargando biometría...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {pestaña === 'composicion' && (
                        <>
                            {/* ── SINCRONIZACIÓN INTELIGENTE ── */}
                            <Text style={estilos.seccionTitulo}>SINCRONIZACIÓN INTELIGENTE</Text>

                            {/* BLE */}
                            <TouchableOpacity style={estilos.sincCard} activeOpacity={0.85}>
                                <View style={[estilos.sincIconBox, { backgroundColor: AZUL + '20' }]}>
                                    <Text style={estilos.sincIcono}>🔵</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.sincTitulo}>Sincronizar Báscula BLE</Text>
                                    <Text style={estilos.sincDesc}>Conexión automática vía Bluetooth con dispositivos compatibles.</Text>
                                </View>
                                <Text style={estilos.sincFlecha}>›</Text>
                            </TouchableOpacity>

                            {/* Foto OCR */}
                            <TouchableOpacity
                                style={estilos.sincCard}
                                activeOpacity={0.85}
                                onPress={subirFotoBáscula}
                                disabled={sincronizando}
                            >
                                <View style={[estilos.sincIconBox, { backgroundColor: NARANJA + '20' }]}>
                                    {sincronizando
                                        ? <ActivityIndicator size="small" color={NARANJA} />
                                        : <Text style={estilos.sincIcono}>📷</Text>
                                    }
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.sincTitulo}>Subir Foto de Pantalla</Text>
                                    <Text style={estilos.sincDesc}>Nuestro sistema OCR extraerá los datos de tu báscula analógica.</Text>
                                </View>
                                <Text style={estilos.sincFlecha}>›</Text>
                            </TouchableOpacity>

                            {/* ── ESTADO CORPORAL ACTUAL ── */}
                            <View style={estilos.estadoHeader}>
                                <Text style={estilos.seccionTitulo}>ESTADO CORPORAL ACTUAL</Text>
                                <View style={estilos.actualizadoBadge}>
                                    <Text style={estilos.actualizadoTxt}>{actualizadoEn}</Text>
                                </View>
                            </View>

                            {/* Cards de composición */}
                            <CardMetrica
                                etiqueta="MASA MUSCULAR"
                                valor={masaMusc ?? '—'}
                                unidad="kg"
                                delta={deltaMusculo}
                                colorBarra={AZUL}
                            />
                            <CardMetrica
                                etiqueta="GRASA CORPORAL"
                                valor={grasaCorp ?? '—'}
                                unidad="%"
                                delta={deltaGrasa}
                                colorBarra={NARANJA}
                            />
                            <CardMetrica
                                etiqueta="PESO TOTAL"
                                valor={pesoTotal ?? '—'}
                                unidad="kg"
                                delta={deltaPeso}
                                colorBarra={BORDE}
                            />

                            {/* ── META ── */}
                            {grasaCorp && (
                                <View style={estilos.metaCard}>
                                    <View style={estilos.metaRow}>
                                        <Text style={estilos.metaTxt}>
                                            Meta: Definición ({metaGrasa}% Grasa)
                                        </Text>
                                        <Text style={estilos.metaPct}>{pctCompletado}% completado</Text>
                                    </View>
                                    <View style={estilos.metaBarFondo}>
                                        <View style={[estilos.metaBarRelleno, { width: `${pctCompletado}%` }]} />
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    {pestaña === 'perimetros' && (
                        <>
                            <Text style={[estilos.seccionTitulo, { marginTop: 20 }]}>ÚLTIMAS MEDIDAS</Text>

                            {perimetros ? (
                                <View style={estilos.perimetrosGrid}>
                                    {[
                                        { zona: 'Cuello',    valor: perimetros.cuello    || '—', delta: perimetros.delta_cuello },
                                        { zona: 'Pecho',     valor: perimetros.pecho     || '—', delta: perimetros.delta_pecho },
                                        { zona: 'Cintura',   valor: perimetros.cintura   || '—', delta: perimetros.delta_cintura },
                                        { zona: 'Cadera',    valor: perimetros.cadera    || '—', delta: perimetros.delta_cadera },
                                        { zona: 'Muslo',     valor: perimetros.muslo     || '—', delta: perimetros.delta_muslo },
                                        { zona: 'Pantorrilla', valor: perimetros.pantorrilla || '—', delta: perimetros.delta_pantorrilla },
                                        { zona: 'Bíceps',    valor: perimetros.biceps    || '—', delta: perimetros.delta_biceps },
                                        { zona: 'Antebrazo', valor: perimetros.antebrazo || '—', delta: perimetros.delta_antebrazo },
                                    ].map((p, i) => (
                                        <CardPerimetro key={i} zona={p.zona} valor={p.valor} delta={p.delta} />
                                    ))}
                                </View>
                            ) : (
                                <View style={estilos.vacioBox}>
                                    <Text style={estilos.vacioIcono}>📏</Text>
                                    <Text style={estilos.vacioTitulo}>Sin perímetros registrados</Text>
                                    <Text style={estilos.vacioDesc}>Toca el botón + para registrar tus medidas corporales.</Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {/* ── FAB ── */}
            <TouchableOpacity
                style={estilos.fab}
                onPress={() => setModalRegistro(true)}
            >
                <Text style={estilos.fabTxt}>+</Text>
            </TouchableOpacity>

            {/* ═══ MODAL REGISTRO MANUAL ═══════════════════════════════════ */}
            <Modal visible={modalRegistro} transparent animationType="slide">
                <TouchableOpacity
                    style={estilos.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalRegistro(false)}
                >
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Registrar medida</Text>

                        <View style={estilos.inputsGrid}>
                            <View style={estilos.inputGrupo}>
                                <Text style={estilos.inputLabel}>Peso (kg) *</Text>
                                <TextInput
                                    style={estilos.inputCampo}
                                    value={pesoKg}
                                    onChangeText={setPesoKg}
                                    keyboardType="decimal-pad"
                                    placeholder="78.5"
                                    placeholderTextColor={SUBTXT}
                                />
                            </View>
                            <View style={estilos.inputGrupo}>
                                <Text style={estilos.inputLabel}>Grasa (%)</Text>
                                <TextInput
                                    style={estilos.inputCampo}
                                    value={grasaPct}
                                    onChangeText={setGrasaPct}
                                    keyboardType="decimal-pad"
                                    placeholder="14.2"
                                    placeholderTextColor={SUBTXT}
                                />
                            </View>
                            <View style={estilos.inputGrupo}>
                                <Text style={estilos.inputLabel}>Músculo (kg)</Text>
                                <TextInput
                                    style={estilos.inputCampo}
                                    value={musculoKg}
                                    onChangeText={setMusculoKg}
                                    keyboardType="decimal-pad"
                                    placeholder="64.8"
                                    placeholderTextColor={SUBTXT}
                                />
                            </View>
                            <View style={estilos.inputGrupo}>
                                <Text style={estilos.inputLabel}>Agua (%)</Text>
                                <TextInput
                                    style={estilos.inputCampo}
                                    value={aguaPct}
                                    onChangeText={setAguaPct}
                                    keyboardType="decimal-pad"
                                    placeholder="60.0"
                                    placeholderTextColor={SUBTXT}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[estilos.modalBtn, guardando && { opacity: 0.6 }]}
                            onPress={guardarManual}
                            disabled={guardando}
                        >
                            {guardando
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={estilos.modalBtnTxt}>Guardar medida</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: FONDO },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 55, paddingBottom: 14, paddingHorizontal: 20,
        backgroundColor: FONDO, borderBottomWidth: 1, borderBottomColor: BORDE,
    },
    headerIzq:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerLogoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    headerLogo:    { fontSize: 18 },
    headerTitulo:  { color: TEXTO, fontSize: 19, fontWeight: '700' },
    refrescaBtn:   { padding: 8 },
    refrescaIcono: { fontSize: 20 },

    // Pestañas
    pestañasContenedor: {
        flexDirection: 'row', margin: 16, marginBottom: 8,
        backgroundColor: CARD2, borderRadius: 14, padding: 4,
        borderWidth: 1, borderColor: BORDE,
    },
    pestañaTab:       { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
    pestañaTabActiva: { backgroundColor: CARD },
    pestañaTxt:       { color: SUBTXT, fontSize: 14, fontWeight: '600' },
    pestañaTxtActivo: { color: AZUL, fontWeight: '700' },

    cargandoBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cargandoTxt: { color: SUBTXT, fontSize: 14, marginTop: 16 },

    // Secciones
    seccionTitulo: {
        color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 1,
        paddingHorizontal: 20, marginTop: 16, marginBottom: 10,
    },

    // Sincronización
    sincCard: {
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: CARD, borderRadius: 14, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderWidth: 1, borderColor: BORDE,
    },
    sincIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    sincIcono:   { fontSize: 22 },
    sincTitulo:  { color: TEXTO, fontSize: 15, fontWeight: '700', marginBottom: 3 },
    sincDesc:    { color: SUBTXT, fontSize: 12, lineHeight: 18 },
    sincFlecha:  { color: SUBTXT, fontSize: 22 },

    // Estado corporal
    estadoHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginTop: 20, marginBottom: 12,
    },
    actualizadoBadge: {
        backgroundColor: AZUL + '15', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: AZUL + '30',
    },
    actualizadoTxt: { color: AZUL, fontSize: 11, fontWeight: '600' },

    // Card métrica
    metricaCard: {
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: CARD, borderRadius: 14,
        borderWidth: 1, borderColor: BORDE,
        flexDirection: 'row', overflow: 'hidden',
    },
    metricaBarra:    { width: 4 },
    metricaContenido:{ flex: 1, padding: 16 },
    metricaRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metricaEtiqueta: { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
    metricaValorRow: { flexDirection: 'row', alignItems: 'baseline' },
    metricaValor:    { color: TEXTO, fontSize: 32, fontWeight: '800' },
    metricaUnidad:   { color: SUBTXT, fontSize: 16 },
    metricaDeltaCol: { alignItems: 'flex-end', gap: 4 },
    metricaDeltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metricaDeltaIcono: { fontSize: 13, fontWeight: '700' },
    metricaDeltaTxt:   { fontSize: 13, fontWeight: '800' },
    metricaVsMes:      { color: SUBTXT, fontSize: 11 },

    // Meta
    metaCard: {
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: CARD, borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: BORDE,
    },
    metaRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    metaTxt:      { color: TEXTO, fontSize: 14, fontWeight: '600' },
    metaPct:      { color: AZUL, fontSize: 14, fontWeight: '800' },
    metaBarFondo: { height: 6, backgroundColor: BORDE, borderRadius: 3, overflow: 'hidden' },
    metaBarRelleno:{ height: 6, backgroundColor: AZUL, borderRadius: 3 },

    // Perímetros grid
    perimetrosGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 16, gap: 10, marginBottom: 16,
    },
    perimetroCard: {
        width: '47%', backgroundColor: CARD, borderRadius: 14,
        padding: 16, borderWidth: 1, borderColor: BORDE,
    },
    perimetroZona:    { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
    perimetroValorRow:{ flexDirection: 'row', alignItems: 'baseline' },
    perimetroValor:   { color: TEXTO, fontSize: 28, fontWeight: '800' },
    perimetroUnidad:  { color: SUBTXT, fontSize: 14 },
    perimetroDelta:   { fontSize: 12, fontWeight: '700', marginTop: 4 },

    // Vacío
    vacioBox: {
        margin: 16, padding: 32, backgroundColor: CARD,
        borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDE,
    },
    vacioIcono:  { fontSize: 48, marginBottom: 12 },
    vacioTitulo: { color: TEXTO, fontSize: 17, fontWeight: '800', marginBottom: 8 },
    vacioDesc:   { color: SUBTXT, fontSize: 13, textAlign: 'center', lineHeight: 20 },

    // FAB
    fab: {
        position: 'absolute', bottom: 90, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: NARANJA,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: NARANJA, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
    },
    fabTxt: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    bottomSheet: {
        backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
        borderTopWidth: 1, borderTopColor: BORDE,
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo: { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    inputsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    inputGrupo:  { width: '47%' },
    inputLabel:  { color: SUBTXT, fontSize: 11, fontWeight: '600', marginBottom: 6 },
    inputCampo: {
        backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE,
        borderRadius: 10, padding: 12, color: TEXTO, fontSize: 15,
    },
    modalBtn:    { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
    modalBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});