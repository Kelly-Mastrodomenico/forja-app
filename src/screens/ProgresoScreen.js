import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const { width: ANCHO } = Dimensions.get('window');

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

// ── Gráfica de barras de peso (compatible Hermes, sin transformOrigin) ────────
function GraficaPeso({ historial }) {
    if (!historial || historial.length < 2) {
        return (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: SUBTXT, fontSize: 12, textAlign: 'center' }}>
                    Necesitas al menos 2 registros para ver la gráfica
                </Text>
            </View>
        );
    }

    const datos = historial.slice(-10);
    const pesos = datos.map(d => parseFloat(d.peso_kg) || 0);
    const minP  = Math.max(0, Math.min(...pesos) - 2);
    const maxP  = Math.max(...pesos) + 1;
    const rango = maxP - minP || 1;
    const altoG = 110;

    return (
        <View>
            {/* Etiquetas Y + barras */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                {/* Eje Y */}
                <View style={{ width: 34, height: altoG, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
                    <Text style={{ color: SUBTXT, fontSize: 9 }}>{maxP.toFixed(0)}</Text>
                    <Text style={{ color: SUBTXT, fontSize: 9 }}>{((maxP + minP) / 2).toFixed(0)}</Text>
                    <Text style={{ color: SUBTXT, fontSize: 9 }}>{minP.toFixed(0)}</Text>
                </View>
                {/* Barras */}
                <View style={{ flex: 1, height: altoG, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    {/* Líneas guía */}
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: BORDE }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, top: altoG / 2, height: 1, backgroundColor: BORDE }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: BORDE }} />

                    {pesos.map((peso, i) => {
                        const alturaBarra = Math.max(4, ((peso - minP) / rango) * altoG);
                        const esPrimero   = i === 0;
                        const esUltimo    = i === pesos.length - 1;
                        const esMax       = peso === Math.max(...pesos);
                        const color       = esMax ? AZUL : AZUL + '70';
                        return (
                            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                {esUltimo && (
                                    <Text style={{ color: AZUL, fontSize: 9, fontWeight: '700', marginBottom: 2 }}>
                                        {peso.toFixed(1)}
                                    </Text>
                                )}
                                <View style={{
                                    width: '100%',
                                    height: alturaBarra,
                                    backgroundColor: color,
                                    borderRadius: 4,
                                    borderTopLeftRadius: 4,
                                    borderTopRightRadius: 4,
                                }} />
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Etiquetas X */}
            <View style={{ flexDirection: 'row', marginLeft: 38, marginTop: 6, gap: 4 }}>
                {datos.map((d, i) => (
                    <Text key={i} style={{ flex: 1, color: SUBTXT, fontSize: 8, textAlign: 'center' }} numberOfLines={1}>
                        {d.fecha?.slice(5) || ''}
                    </Text>
                ))}
            </View>
        </View>
    );
}

// ── Campo de medida individual ────────────────────────────────────────────────
function CampoMedida({ label, unidad, valor, onChange, izqDer }) {
    if (izqDer) {
        return (
            <View style={cmpEstilos.caja}>
                <Text style={cmpEstilos.label}>{label}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={cmpEstilos.ladoLabel}>Der.</Text>
                        <TextInput
                            style={cmpEstilos.input}
                            value={valor?.der || ''}
                            onChangeText={v => onChange({ ...valor, der: v })}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={SUBTXT}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={cmpEstilos.ladoLabel}>Izq.</Text>
                        <TextInput
                            style={cmpEstilos.input}
                            value={valor?.izq || ''}
                            onChangeText={v => onChange({ ...valor, izq: v })}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={SUBTXT}
                        />
                    </View>
                    <Text style={cmpEstilos.unidad}>{unidad}</Text>
                </View>
            </View>
        );
    }
    return (
        <View style={cmpEstilos.caja}>
            <Text style={cmpEstilos.label}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                    style={[cmpEstilos.input, { flex: 1 }]}
                    value={valor || ''}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={SUBTXT}
                />
                <Text style={cmpEstilos.unidad}>{unidad}</Text>
            </View>
        </View>
    );
}
const cmpEstilos = StyleSheet.create({
    caja:      { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDE },
    label:     { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    ladoLabel: { color: SUBTXT, fontSize: 10, marginBottom: 4 },
    input:     { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 10, fontSize: 14, textAlign: 'center' },
    unidad:    { color: SUBTXT, fontSize: 13, width: 36 },
});

// ── Badge de diferencia vs anterior ──────────────────────────────────────────
function BadgeDiff({ actual, anterior, invertir }) {
    if (!actual || !anterior) return null;
    const d   = (parseFloat(actual) - parseFloat(anterior)).toFixed(1);
    const num = parseFloat(d);
    if (num === 0) return null;
    const bien  = invertir ? num < 0 : num > 0;
    const color = bien ? VERDE : ROJO;
    return (
        <View style={{ backgroundColor: color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: color + '40' }}>
            <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{num > 0 ? '+' : ''}{d}</Text>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProgresoScreen({ navigation }) {
    const [tab, setTab]             = useState('composicion');
    const [ultima, setUltima]       = useState(null);
    const [anterior, setAnterior]   = useState(null);
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [modalReg, setModalReg]   = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Campos formulario
    const [fPeso, setFPeso]               = useState('');
    const [fGrasa, setFGrasa]             = useState('');
    const [fMuscular, setFMuscular]       = useState('');
    const [fEsqueletica, setFEsqueletica] = useState('');
    const [fAgua, setFAgua]               = useState('');
    const [fImc, setFImc]                 = useState('');
    const [fVisceral, setFVisceral]       = useState('');
    const [fMetabolismo, setFMetabolismo] = useState('');
    const [fCintura, setFCintura]         = useState('');
    const [fCadera, setFCadera]           = useState('');
    const [fPecho, setFPecho]             = useState('');
    const [fCuello, setFCuello]           = useState('');
    const [fBicep, setFBicep]             = useState({ der: '', izq: '' });
    const [fCuadriceps, setFCuadriceps]   = useState({ der: '', izq: '' });
    const [fPantorrilla, setFPantorrilla] = useState({ der: '', izq: '' });
    const [fNotas, setFNotas]             = useState('');

    useFocusEffect(useCallback(() => { cargarDatos(); }, []));

    async function cargarDatos() {
        setCargando(true);
        try {
            const token   = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };
            const [rUlt, rHist] = await Promise.all([
                axios.get(`${API_URL}/medidas/ultima-medida.php`, { headers, timeout: 10000 }),
                axios.get(`${API_URL}/medidas/historial.php`,     { headers, timeout: 10000 }),
            ]);
            if (rUlt.data)         setUltima(rUlt.data);
            if (rHist.data?.medidas) {
                const hist = rHist.data.medidas;
                setHistorial(hist);
                if (hist.length >= 2) setAnterior(hist[hist.length - 2]);
            }
        } catch (e) { console.log('Error progreso:', e.message); }
        finally { setCargando(false); }
    }

    function abrirModal() {
        if (ultima) {
            setFPeso(ultima.peso_kg          ? String(ultima.peso_kg)          : '');
            setFGrasa(ultima.grasa_corporal  ? String(ultima.grasa_corporal)   : '');
            setFMuscular(ultima.masa_muscular ? String(ultima.masa_muscular)   : '');
            setFEsqueletica(ultima.masa_esqueletica ? String(ultima.masa_esqueletica) : '');
            setFAgua(ultima.contenido_agua   ? String(ultima.contenido_agua)   : '');
            setFImc(ultima.imc               ? String(ultima.imc)              : '');
            setFVisceral(ultima.grasa_visceral ? String(ultima.grasa_visceral) : '');
            setFMetabolismo(ultima.metabolismo_basal ? String(ultima.metabolismo_basal) : '');
            setFCintura(ultima.cintura_cm    ? String(ultima.cintura_cm)       : '');
            setFCadera(ultima.cadera_cm      ? String(ultima.cadera_cm)        : '');
            setFPecho(ultima.pecho_cm        ? String(ultima.pecho_cm)         : '');
            setFCuello(ultima.cuello_cm      ? String(ultima.cuello_cm)        : '');
            setFBicep({ der: ultima.bicep_der_cm ? String(ultima.bicep_der_cm) : '', izq: ultima.bicep_izq_cm ? String(ultima.bicep_izq_cm) : '' });
            setFCuadriceps({ der: ultima.cuadriceps_der_cm ? String(ultima.cuadriceps_der_cm) : '', izq: ultima.cuadriceps_izq_cm ? String(ultima.cuadriceps_izq_cm) : '' });
            setFPantorrilla({ der: ultima.pantorrilla_der_cm ? String(ultima.pantorrilla_der_cm) : '', izq: ultima.pantorrilla_izq_cm ? String(ultima.pantorrilla_izq_cm) : '' });
        }
        setFNotas('');
        setModalReg(true);
    }

    async function guardarMedida() {
        if (!fPeso || parseFloat(fPeso) < 20) {
            Alert.alert('Error', 'El peso es obligatorio y debe ser mayor a 20 kg.');
            return;
        }
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/medidas/registrar-medida.php`,
                {
                    peso_kg:            parseFloat(fPeso)        || null,
                    grasa_corporal:     parseFloat(fGrasa)       || null,
                    masa_muscular:      parseFloat(fMuscular)    || null,
                    masa_esqueletica:   parseFloat(fEsqueletica) || null,
                    contenido_agua:     parseFloat(fAgua)        || null,
                    imc:                parseFloat(fImc)         || null,
                    grasa_visceral:     parseInt(fVisceral)      || null,
                    metabolismo_basal:  parseInt(fMetabolismo)   || null,
                    cintura_cm:         parseFloat(fCintura)     || null,
                    cadera_cm:          parseFloat(fCadera)      || null,
                    pecho_cm:           parseFloat(fPecho)       || null,
                    cuello_cm:          parseFloat(fCuello)      || null,
                    bicep_der_cm:       parseFloat(fBicep.der)   || null,
                    bicep_izq_cm:       parseFloat(fBicep.izq)   || null,
                    cuadriceps_der_cm:  parseFloat(fCuadriceps.der)  || null,
                    cuadriceps_izq_cm:  parseFloat(fCuadriceps.izq)  || null,
                    pantorrilla_der_cm: parseFloat(fPantorrilla.der) || null,
                    pantorrilla_izq_cm: parseFloat(fPantorrilla.izq) || null,
                    notas:              fNotas.trim() || null,
                    fuente:             'manual',
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            setModalReg(false);
            await cargarDatos();
            Alert.alert('✅', 'Medida registrada.');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'No se pudo guardar.');
        } finally { setGuardando(false); }
    }

    // Porcentaje de meta de grasa (ejemplo: meta 12%)
    const metaGrasa  = 12;
    const grasaActual = parseFloat(ultima?.grasa_corporal || 20);
    const grasaInicio = 20;
    const pctMeta    = Math.min(100, Math.max(0, Math.round(((grasaInicio - grasaActual) / (grasaInicio - metaGrasa)) * 100)));

    return (
        <View style={estilos.contenedor}>

            {/* ── TABS ── */}
            <View style={estilos.tabsRow}>
                {['composicion', 'perimetros'].map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[estilos.tab, tab === t && estilos.tabActivo]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[estilos.tabTxt, tab === t && estilos.tabTxtActivo]}>
                            {t === 'composicion' ? 'Composición' : 'Perímetros'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {cargando ? (
                <View style={estilos.cargandoBox}>
                    <ActivityIndicator color={AZUL} size="large" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── SINCRONIZACIÓN ── */}
                    <View style={estilos.syncCard}>
                        <Text style={estilos.secTitulo}>SINCRONIZACIÓN INTELIGENTE</Text>
                        <TouchableOpacity style={estilos.syncBtn} onPress={() => navigation.navigate('Bascula')}>
                            <View style={estilos.syncIconBox}>
                                <Text style={{ fontSize: 20 }}>📷</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.syncNombre}>Subir Foto de Báscula</Text>
                                <Text style={estilos.syncDesc}>OCR extrae los datos automáticamente</Text>
                            </View>
                            <Text style={{ color: SUBTXT, fontSize: 22 }}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── CABECERA ESTADO ── */}
                    {ultima && (
                        <View style={estilos.estadoRow}>
                            <Text style={estilos.secTitulo}>ESTADO CORPORAL ACTUAL</Text>
                            <View style={estilos.fechaBadge}>
                                <Text style={estilos.fechaTxt}>Actualizado {ultima.fecha}</Text>
                            </View>
                        </View>
                    )}

                    {tab === 'composicion' ? (<>

                        {/* ── 4 MÉTRICAS PRINCIPALES ── */}
                        <View style={estilos.metricasGrid}>
                            {[
                                { icono: '💪', label: 'MASA MUSCULAR',  campo: 'masa_muscular',  unidad: 'kg', color: AZUL,    invertir: false },
                                { icono: '🔥', label: 'GRASA CORPORAL', campo: 'grasa_corporal', unidad: '%',  color: NARANJA, invertir: true  },
                                { icono: '⚖️', label: 'PESO TOTAL',     campo: 'peso_kg',        unidad: 'kg', color: TEXTO,   invertir: false },
                                { icono: '🦴', label: 'MASA ESQUELÉTICA',campo:'masa_esqueletica',unidad: 'kg', color: VERDE,   invertir: false },
                            ].map((m, i) => (
                                <View key={i} style={[estilos.metricaCard, { borderLeftColor: m.color }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={estilos.metricaLabel}>{m.label}</Text>
                                        <BadgeDiff actual={ultima?.[m.campo]} anterior={anterior?.[m.campo]} invertir={m.invertir} />
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                                        <Text style={{ fontSize: 20, marginBottom: 2 }}>{m.icono}</Text>
                                        <Text style={[estilos.metricaValor, { color: m.color }]}>
                                            {ultima?.[m.campo] ? parseFloat(ultima[m.campo]).toFixed(1) : '—'}
                                        </Text>
                                        <Text style={estilos.metricaUnidad}>{m.unidad}</Text>
                                    </View>
                                    <Text style={estilos.metricaSub}>vs. mes pasado</Text>
                                </View>
                            ))}
                        </View>

                        {/* ── MÉTRICAS AVANZADAS ── */}
                        {(ultima?.imc || ultima?.metabolismo_basal || ultima?.grasa_visceral || ultima?.contenido_agua) && (
                            <View style={estilos.avanzadasCard}>
                                <Text style={estilos.secTitulo}>MÉTRICAS AVANZADAS</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 }}>
                                    {ultima?.imc             && <View style={estilos.avItem}><Text style={estilos.avVal}>{parseFloat(ultima.imc).toFixed(1)}</Text><Text style={estilos.avLabel}>IMC</Text></View>}
                                    {ultima?.metabolismo_basal && <View style={estilos.avItem}><Text style={estilos.avVal}>{ultima.metabolismo_basal}</Text><Text style={estilos.avLabel}>TMB kcal</Text></View>}
                                    {ultima?.grasa_visceral  && <View style={estilos.avItem}><Text style={[estilos.avVal, { color: parseInt(ultima.grasa_visceral) > 9 ? ROJO : VERDE }]}>{ultima.grasa_visceral}</Text><Text style={estilos.avLabel}>Visceral</Text></View>}
                                    {ultima?.contenido_agua  && <View style={estilos.avItem}><Text style={estilos.avVal}>{parseFloat(ultima.contenido_agua).toFixed(1)}%</Text><Text style={estilos.avLabel}>Agua</Text></View>}
                                </View>
                            </View>
                        )}

                        {/* ── META GRASA ── */}
                        <View style={estilos.metaCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                <Text style={{ color: SUBTXT, fontSize: 13 }}>Meta: Definición ({metaGrasa}% Grasa)</Text>
                                <Text style={{ color: AZUL, fontSize: 13, fontWeight: '700' }}>{pctMeta}% completado</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: BORDE, borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ height: 6, width: `${pctMeta}%`, backgroundColor: AZUL, borderRadius: 3 }} />
                            </View>
                        </View>

                        {/* ── GRÁFICA PESO ── */}
                        <View style={estilos.graficaCard}>
                            <Text style={estilos.secTitulo}>EVOLUCIÓN DEL PESO</Text>
                            <GraficaPeso historial={historial} />
                        </View>

                        {/* ── HISTORIAL ── */}
                        {historial.length > 0 && (
                            <View style={estilos.historialCard}>
                                <Text style={estilos.secTitulo}>HISTORIAL RECIENTE</Text>
                                {historial.slice(-5).reverse().map((h, i) => (
                                    <View key={i} style={[estilos.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                                        <Text style={estilos.histFecha}>{h.fecha}</Text>
                                        <Text style={estilos.histPeso}>{parseFloat(h.peso_kg).toFixed(1)} kg</Text>
                                        {h.grasa_corporal && <Text style={{ color: NARANJA, fontSize: 12 }}>{parseFloat(h.grasa_corporal).toFixed(1)}% grasa</Text>}
                                        {h.masa_muscular  && <Text style={{ color: AZUL,    fontSize: 12 }}>{parseFloat(h.masa_muscular).toFixed(1)} kg músculo</Text>}
                                    </View>
                                ))}
                            </View>
                        )}

                    </>) : (<>

                        {/* ── TAB PERÍMETROS ── */}
                        <View style={estilos.perimetrosCard}>
                            <Text style={estilos.secTitulo}>PERÍMETROS CORPORALES</Text>
                            {[
                                { label: 'Cintura',    derVal: ultima?.cintura_cm,       izqVal: null,                    campo: 'cintura_cm' },
                                { label: 'Cadera',     derVal: ultima?.cadera_cm,        izqVal: null,                    campo: 'cadera_cm' },
                                { label: 'Pecho',      derVal: ultima?.pecho_cm,         izqVal: null,                    campo: 'pecho_cm' },
                                { label: 'Cuello',     derVal: ultima?.cuello_cm,        izqVal: null,                    campo: 'cuello_cm' },
                                { label: 'Bíceps',     derVal: ultima?.bicep_der_cm,     izqVal: ultima?.bicep_izq_cm,     campo: 'bicep_der_cm' },
                                { label: 'Cuádriceps', derVal: ultima?.cuadriceps_der_cm,izqVal: ultima?.cuadriceps_izq_cm,campo: 'cuadriceps_der_cm' },
                                { label: 'Pantorrilla',derVal: ultima?.pantorrilla_der_cm,izqVal:ultima?.pantorrilla_izq_cm,campo:'pantorrilla_der_cm'},
                            ].map((p, i) => (
                                <View key={i} style={[estilos.perRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                                    <Text style={estilos.perLabel}>{p.label}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                        {p.izqVal !== null ? (<>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={estilos.perVal}>{p.derVal ? `${parseFloat(p.derVal).toFixed(1)}` : '—'}</Text>
                                                <Text style={{ color: SUBTXT, fontSize: 9 }}>Der cm</Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={[estilos.perVal, { color: SUBTXT }]}>{p.izqVal ? `${parseFloat(p.izqVal).toFixed(1)}` : '—'}</Text>
                                                <Text style={{ color: SUBTXT, fontSize: 9 }}>Izq cm</Text>
                                            </View>
                                        </>) : (
                                            <Text style={estilos.perVal}>{p.derVal ? `${parseFloat(p.derVal).toFixed(1)} cm` : '—'}</Text>
                                        )}
                                        <BadgeDiff actual={p.derVal} anterior={anterior?.[p.campo]} invertir={false} />
                                    </View>
                                </View>
                            ))}
                            {!ultima?.cintura_cm && !ultima?.bicep_der_cm && (
                                <Text style={{ color: SUBTXT, textAlign: 'center', padding: 20, fontSize: 13 }}>
                                    Registra tu primera medida para ver los perímetros.
                                </Text>
                            )}
                        </View>
                    </>)}

                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {/* ── FAB ── */}
            <TouchableOpacity style={estilos.fab} onPress={abrirModal}>
                <Text style={estilos.fabIcono}>＋</Text>
            </TouchableOpacity>

            {/* ══ MODAL REGISTRO ══════════════════════════════════════════ */}
            <Modal visible={modalReg} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Nueva Medida</Text>
                        <Text style={{ color: SUBTXT, fontSize: 13, marginBottom: 14 }}>
                            Solo el peso es obligatorio. Los campos vacíos se ignoran.
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={estilos.sheetSeccion}>📊 COMPOSICIÓN CORPORAL</Text>
                            <CampoMedida label="Peso *"              unidad="kg"   valor={fPeso}        onChange={setFPeso} />
                            <CampoMedida label="Grasa Corporal"       unidad="%"    valor={fGrasa}       onChange={setFGrasa} />
                            <CampoMedida label="Masa Muscular"        unidad="kg"   valor={fMuscular}    onChange={setFMuscular} />
                            <CampoMedida label="Masa Esquelética"     unidad="kg"   valor={fEsqueletica} onChange={setFEsqueletica} />
                            <CampoMedida label="Contenido de Agua"    unidad="%"    valor={fAgua}        onChange={setFAgua} />
                            <CampoMedida label="IMC"                  unidad=""     valor={fImc}         onChange={setFImc} />
                            <CampoMedida label="Grasa Visceral"       unidad="pts"  valor={fVisceral}    onChange={setFVisceral} />
                            <CampoMedida label="Metabolismo Basal"    unidad="kcal" valor={fMetabolismo} onChange={setFMetabolismo} />

                            <Text style={estilos.sheetSeccion}>📏 PERÍMETROS</Text>
                            <CampoMedida label="Cintura"     unidad="cm" valor={fCintura}     onChange={setFCintura} />
                            <CampoMedida label="Cadera"      unidad="cm" valor={fCadera}      onChange={setFCadera} />
                            <CampoMedida label="Pecho"       unidad="cm" valor={fPecho}       onChange={setFPecho} />
                            <CampoMedida label="Cuello"      unidad="cm" valor={fCuello}      onChange={setFCuello} />
                            <CampoMedida label="Bíceps"      unidad="cm" valor={fBicep}       onChange={setFBicep}       izqDer />
                            <CampoMedida label="Cuádriceps"  unidad="cm" valor={fCuadriceps}  onChange={setFCuadriceps}  izqDer />
                            <CampoMedida label="Pantorrilla" unidad="cm" valor={fPantorrilla} onChange={setFPantorrilla} izqDer />

                            <Text style={estilos.sheetSeccion}>📝 NOTAS</Text>
                            <TextInput
                                style={[estilos.inputCampo, { height: 70, textAlignVertical: 'top', marginBottom: 4 }]}
                                value={fNotas}
                                onChangeText={setFNotas}
                                placeholder="Ej: Medida en ayunas, foto báscula adjunta..."
                                placeholderTextColor={SUBTXT}
                                multiline
                            />

                            <TouchableOpacity
                                style={[estilos.btnGuardar, guardando && { opacity: 0.6 }]}
                                onPress={guardarMedida}
                                disabled={guardando}
                            >
                                {guardando
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={estilos.btnGuardarTxt}>Guardar Medida</Text>
                                }
                            </TouchableOpacity>
                            <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setModalReg(false)}>
                                <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
    contenedor:  { flex: 1, backgroundColor: FONDO },
    cargandoBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    tabsRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDE },
    tab:         { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActivo:   { borderBottomWidth: 2, borderBottomColor: AZUL },
    tabTxt:      { color: SUBTXT, fontSize: 14, fontWeight: '600' },
    tabTxtActivo:{ color: AZUL },

    syncCard:    { margin: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    syncBtn:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    syncIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center' },
    syncNombre:  { color: TEXTO, fontSize: 14, fontWeight: '700' },
    syncDesc:    { color: SUBTXT, fontSize: 12, marginTop: 2 },

    estadoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    secTitulo:   { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    fechaBadge:  { backgroundColor: VERDE + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: VERDE + '30' },
    fechaTxt:    { color: VERDE, fontSize: 10, fontWeight: '600' },

    metricasGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 10 },
    metricaCard:   { width: (ANCHO - 40) / 2, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE, borderLeftWidth: 3 },
    metricaLabel:  { color: SUBTXT, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    metricaValor:  { fontSize: 26, fontWeight: '800' },
    metricaUnidad: { color: SUBTXT, fontSize: 13, marginBottom: 4 },
    metricaSub:    { color: SUBTXT, fontSize: 10 },

    avanzadasCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    avItem:        { alignItems: 'center', gap: 4 },
    avVal:         { color: TEXTO, fontSize: 20, fontWeight: '800' },
    avLabel:       { color: SUBTXT, fontSize: 10 },

    metaCard:    { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    graficaCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },

    historialCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    histRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
    histFecha:     { color: SUBTXT, fontSize: 12, width: 80 },
    histPeso:      { color: TEXTO, fontSize: 14, fontWeight: '700' },

    perimetrosCard:{ margin: 16, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    perRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    perLabel:      { color: SUBTXT, fontSize: 13, flex: 1 },
    perVal:        { color: TEXTO, fontSize: 15, fontWeight: '700' },

    fab:      { position: 'absolute', right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28, backgroundColor: NARANJA, justifyContent: 'center', alignItems: 'center', shadowColor: NARANJA, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
    fabIcono: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    bottomSheet:  { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, maxHeight: '92%', borderTopWidth: 1, borderTopColor: BORDE },
    sheetHandle:  { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    sheetTitulo:  { color: TEXTO, fontSize: 20, fontWeight: '800', marginBottom: 4 },
    sheetSeccion: { color: AZUL, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 2 },
    inputCampo:   { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 12, fontSize: 14, marginTop: 8 },
    btnGuardar:   { backgroundColor: AZUL, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
    btnGuardarTxt:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});