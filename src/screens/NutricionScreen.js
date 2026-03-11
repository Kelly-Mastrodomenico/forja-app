import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const FONDO   = '#0a0a0a';
const CARD    = '#111111';
const CARD2   = '#1a1a1a';
const BORDE   = '#2a2a2a';
const AZUL    = '#3b82f6';
const NARANJA = '#f97316';
const TEXTO   = '#ffffff';
const SUBTXT  = '#6b7280';
const VERDE   = '#22c55e';
const ROSA    = '#f472b6';

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MOMENTOS_ORDEN = [
    'desayuno', 'media_manana', 'almuerzo',
    'merienda', 'pre_entreno', 'post_entreno', 'cena'
];
const MOMENTOS_LABEL = {
    desayuno:     'Desayuno',
    media_manana: 'Media Mañana',
    almuerzo:     'Almuerzo',
    merienda:     'Merienda',
    pre_entreno:  'Pre-Entreno',
    post_entreno: 'Post-Entreno',
    cena:         'Cena',
};
const FASE_COLOR = {
    folicular:  AZUL,
    ovulatoria: VERDE,
    lutea:      NARANJA,
    menstrual:  ROSA,
};
const FASE_LABEL = {
    folicular:  'Folicular',
    ovulatoria: 'Ovulatoria',
    lutea:      'Fase Lútea',
    menstrual:  'Menstrual',
};

// ── Barra de macro ────────────────────────────────────────────────────────────
function BarraMacro({ actual, objetivo, color }) {
    const pct = objetivo > 0 ? Math.min((actual / objetivo) * 100, 100) : 0;
    return (
        <View style={{ height: 3, backgroundColor: BORDE, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 3, width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
        </View>
    );
}

// ── Card de comida ────────────────────────────────────────────────────────────
function ComidaCard({ comida }) {
    const [expandido, setExpandido] = useState(false);
    const ingredientes = comida.ingredientes || [];

    return (
        <View style={estilos.comidaCard}>
            <TouchableOpacity
                style={estilos.comidaHeader}
                onPress={() => setExpandido(!expandido)}
                activeOpacity={0.8}
            >
                <View style={[estilos.comidaBorde, { backgroundColor: AZUL }]} />
                <View style={{ flex: 1 }}>
                    <Text style={estilos.comidaNombre}>{comida.nombre_comida}</Text>
                    <Text style={estilos.comidaHora}>
                        ⏱ {comida.hora_sugerida || '--:--'} · {MOMENTOS_LABEL[comida.momento] || comida.momento}
                    </Text>
                </View>
                <Text style={estilos.comidaKcal}>{comida.calorias ? `${Math.round(comida.calorias)} kcal` : ''}</Text>
                <Text style={estilos.chevron}>{expandido ? '∧' : '∨'}</Text>
            </TouchableOpacity>

            {expandido && (
                <View style={estilos.comidaBody}>
                    {ingredientes.map((ing, i) => (
                        <View key={i} style={[estilos.ingredienteRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.ingredienteNombre}>{ing.nombre}</Text>
                                {ing.peso_crudo && <Text style={estilos.pesoCrudo}>PESO CRUDO</Text>}
                            </View>
                            <Text style={estilos.ingredienteCantidad}>
                                {ing.cantidad_g}{ing.unidad || 'g'}
                            </Text>
                        </View>
                    ))}

                    {/* Macros de la comida */}
                    {(comida.proteinas || comida.carbos || comida.grasas) && (
                        <View style={estilos.macrosComidaRow}>
                            <Text style={estilos.macroComidaLabel}>PRO</Text>
                            <Text style={estilos.macroComidaValAzul}>{Math.round(comida.proteinas || 0)}g</Text>
                            <View style={estilos.sep} />
                            <Text style={estilos.macroComidaLabel}>CHO</Text>
                            <Text style={estilos.macroComidaValNaranja}>{Math.round(comida.carbos || 0)}g</Text>
                            <View style={estilos.sep} />
                            <Text style={estilos.macroComidaLabel}>FAT</Text>
                            <Text style={estilos.macroComidaVal}>{Math.round(comida.grasas || 0)}g</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function NutricionScreen({ navigation }) {
    const [plan, setPlan]           = useState(null);
    const [cargando, setCargando]   = useState(true);
    const [diaVer, setDiaVer]       = useState(null); // null = hoy

    // Modal registro manual
    const [modalManual, setModalManual]   = useState(false);
    const [busqueda, setBusqueda]         = useState('');
    const [resultados, setResultados]     = useState([]);
    const [buscando, setBuscando]         = useState(false);
    const [alimSel, setAlimSel]           = useState(null);
    const [cantidad, setCantidad]         = useState('100');
    const [momento, setMomento]           = useState('almuerzo');
    const [guardando, setGuardando]       = useState(false);

    const diaHoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    useFocusEffect(useCallback(() => {
        cargarPlan(diaVer ?? diaHoy);
    }, [diaVer]));

    async function cargarPlan(dia) {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.get(
                `${API_URL}/nutricion/plan-hoy.php?dia_semana=${dia}`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 }
            );
            setPlan(resp.data);
        } catch (e) {
            console.log('Error cargando plan:', e.message);
            setPlan(null);
        } finally {
            setCargando(false);
        }
    }

    async function buscarAlimento(texto) {
        if (texto.length < 2) { setResultados([]); return; }
        setBuscando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.get(
                `${API_URL}/nutricion/buscar-alimento.php?q=${encodeURIComponent(texto)}`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
            );
            setResultados(resp.data?.alimentos || []);
        } catch { setResultados([]); }
        finally { setBuscando(false); }
    }

    async function guardarRegistro() {
        if (!alimSel || !cantidad || parseFloat(cantidad) <= 0) {
            Alert.alert('Error', 'Selecciona un alimento y una cantidad válida.');
            return;
        }
        setGuardando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/nutricion/registrar-comida.php`,
                { alimento_id: alimSel.id, cantidad_gramos: parseFloat(cantidad), momento, fecha: new Date().toISOString().split('T')[0] },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            setModalManual(false);
            setBusqueda(''); setResultados([]); setAlimSel(null); setCantidad('100');
            await cargarPlan(diaVer ?? diaHoy);
            Alert.alert('✅', 'Alimento registrado.');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'No se pudo registrar.');
        } finally { setGuardando(false); }
    }

    // ── Agrupar comidas del plan por momento ──────────────────────────────────
    const comidasPlan = plan?.comidas || [];

    const obj = plan?.macros_objetivo || {};
    const real = plan?.macros_real    || {};

    return (
        <View style={estilos.contenedor}>

            {/* ── SELECTOR DE DÍAS ── */}
            <View style={estilos.diasRow}>
                {DIAS_LABEL.map((label, idx) => {
                    const esHoy    = idx === diaHoy;
                    const esActivo = idx === (diaVer ?? diaHoy);
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[estilos.diaBtn,
                                esActivo && estilos.diaBtnActivo,
                                esHoy && !esActivo && estilos.diaBtnHoy,
                            ]}
                            onPress={() => setDiaVer(idx)}
                        >
                            <Text style={[estilos.diaTxt, esActivo && estilos.diaTxtActivo]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {cargando ? (
                <View style={estilos.cargandoBox}>
                    <ActivityIndicator color={AZUL} size="large" />
                    <Text style={estilos.cargandoTxt}>Cargando plan del día...</Text>
                </View>
            ) : !plan?.tiene_plan ? (
                /* ── SIN PLAN ── */
                <View style={estilos.sinPlanBox}>
                    <Text style={estilos.sinPlanEmoji}>🍽️</Text>
                    <Text style={estilos.sinPlanTitulo}>Sin plan nutricional</Text>
                    <Text style={estilos.sinPlanDesc}>
                        Genera tu rutina de entrenamiento para obtener un plan de nutrición personalizado para cada día de la semana.
                    </Text>
                    <TouchableOpacity
                        style={estilos.sinPlanBtn}
                        onPress={() => navigation.navigate('Entreno')}
                    >
                        <Text style={estilos.sinPlanBtnTxt}>⚡ Ir a Entrenamiento</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* ── CARD ESTRATEGIA ── */}
                    <View style={estilos.estrategiaCard}>
                        <View style={estilos.estrategiaTop}>
                            <View style={estilos.estrategiaIconBox}>
                                <Text style={{ fontSize: 22 }}>{plan.tipo_dia === 'entreno' ? '🔥' : '💤'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.estrategiaDia}>{plan.nombre_dia || 'Día de Entrenamiento'}</Text>
                                <Text style={estilos.estrategiaTipo}>
                                    {plan.tipo_dia === 'entreno' ? 'Alta Recarga de Carbohidratos' : 'Carbohidratos Moderados'}
                                </Text>
                            </View>
                            {plan.fase_hormonal && (
                                <View style={[estilos.faseBadge, { borderColor: FASE_COLOR[plan.fase_hormonal] + '60', backgroundColor: FASE_COLOR[plan.fase_hormonal] + '15' }]}>
                                    <Text style={[estilos.faseTxt, { color: FASE_COLOR[plan.fase_hormonal] }]}>
                                        {FASE_LABEL[plan.fase_hormonal]}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {plan.estrategia && (
                            <Text style={estilos.estrategiaDesc}>{plan.estrategia}</Text>
                        )}
                        <View style={estilos.estadoRow}>
                            <Text style={estilos.estadoLabel}>ESTADO METABÓLICO</Text>
                            <View style={estilos.estadoBadge}>
                                <Text style={estilos.estadoTxt}>{plan.estado_metabolico || 'Óptimo'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── MACROS OBJETIVO ── */}
                    <View style={estilos.macrosCard}>
                        <Text style={estilos.seccionTitulo}>PLAN DE MACROS · IA GENERADO</Text>
                        <View style={estilos.macrosGrid}>
                            {[
                                { icono: '🔥', label: 'Calorías',  val: obj.calorias,  unidad: 'kcal', color: NARANJA },
                                { icono: '🥩', label: 'Proteínas', val: obj.proteinas, unidad: 'g',    color: AZUL },
                                { icono: '🌾', label: 'Carbos',    val: obj.carbos,    unidad: 'g',    color: '#f59e0b' },
                                { icono: '💧', label: 'Grasas',    val: obj.grasas,    unidad: 'g',    color: '#a855f7' },
                            ].map((m, i) => (
                                <View key={i} style={estilos.macroItem}>
                                    <Text style={estilos.macroIcono}>{m.icono}</Text>
                                    <Text style={[estilos.macroValor, { color: m.color }]}>{Math.round(m.val || 0)}</Text>
                                    <Text style={estilos.macroUnidad}>{m.unidad}</Text>
                                    <Text style={estilos.macroLabel}>{m.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* ── PROGRESO REAL DEL DÍA ── */}
                    <View style={estilos.progresoCard}>
                        <Text style={estilos.seccionTitulo}>PROGRESO REAL HOY</Text>
                        {[
                            { label: 'Calorías',    actual: real.calorias,  obj: obj.calorias,  color: NARANJA },
                            { label: 'Proteínas g', actual: real.proteinas, obj: obj.proteinas, color: AZUL },
                            { label: 'Carbos g',    actual: real.carbos,    obj: obj.carbos,    color: '#f59e0b' },
                            { label: 'Grasas g',    actual: real.grasas,    obj: obj.grasas,    color: '#a855f7' },
                        ].map((m, i) => (
                            <View key={i} style={[estilos.progresoRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                                <Text style={estilos.progresoLabel}>{m.label}</Text>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <Text style={estilos.progresoReal}>{Math.round(m.actual || 0)}</Text>
                                        <Text style={estilos.progresoObj}>/ {Math.round(m.obj || 0)}</Text>
                                    </View>
                                    <BarraMacro actual={m.actual || 0} objetivo={m.obj || 1} color={m.color} />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* ── PLAN DE COMIDAS ── */}
                    <View style={estilos.planHeader}>
                        <Text style={estilos.seccionTitulo}>PLAN DE COMIDAS</Text>
                        <View style={estilos.totalBadge}>
                            <Text style={estilos.totalTxt}>Total: {Math.round(obj.calorias || 0)} kcal</Text>
                        </View>
                    </View>

                    {comidasPlan.length > 0 ? (
                        comidasPlan.map((comida, i) => (
                            <ComidaCard key={i} comida={comida} />
                        ))
                    ) : (
                        <View style={estilos.sinComidasBox}>
                            <Text style={estilos.sinComidasTxt}>Sin comidas generadas para este día</Text>
                        </View>
                    )}

                    <View style={{ height: 140 }} />
                </ScrollView>
            )}

            {/* ── FABs ── */}
            {plan?.tiene_plan && (
                <>
                    <TouchableOpacity
                        style={[estilos.fab, estilos.fabAzul]}
                        onPress={() => setModalManual(true)}
                    >
                        <Text style={estilos.fabIcono}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[estilos.fab, estilos.fabNaranja]}
                        onPress={() => navigation.navigate('EscanearEtiqueta')}
                    >
                        <Text style={estilos.fabIcono}>📷</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* ═══ MODAL REGISTRO MANUAL ══════════════════════════════════ */}
            <Modal visible={modalManual} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Registrar alimento</Text>

                        <View style={estilos.buscadorRow}>
                            <TextInput
                                style={estilos.buscadorInput}
                                placeholder="Buscar alimento..."
                                placeholderTextColor={SUBTXT}
                                value={busqueda}
                                onChangeText={v => { setBusqueda(v); buscarAlimento(v); }}
                            />
                            {buscando && <ActivityIndicator color={AZUL} size="small" style={{ marginLeft: 8 }} />}
                        </View>

                        {resultados.length > 0 && !alimSel && (
                            <ScrollView style={{ maxHeight: 200, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                                {resultados.map(a => (
                                    <TouchableOpacity
                                        key={a.id}
                                        style={estilos.resultadoItem}
                                        onPress={() => { setAlimSel(a); setResultados([]); }}
                                    >
                                        <Text style={estilos.resultadoNombre}>{a.nombre}</Text>
                                        <Text style={estilos.resultadoDetalle}>{a.calorias_100g} kcal/100g · {a.proteinas_100g}g prot</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {alimSel && (
                            <View style={estilos.alimSelCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[estilos.resultadoNombre, { flex: 1 }]}>{alimSel.nombre}</Text>
                                    <TouchableOpacity onPress={() => setAlimSel(null)}>
                                        <Text style={{ color: '#ef4444', fontSize: 18 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={estilos.resultadoDetalle}>
                                    {alimSel.calorias_100g} kcal · {alimSel.proteinas_100g}g P · {alimSel.carbohidratos_100g}g C · {alimSel.grasas_100g}g G (por 100g)
                                </Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Cantidad (g)</Text>
                                <TextInput
                                    style={estilos.inputCampo}
                                    value={cantidad}
                                    onChangeText={setCantidad}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={{ flex: 2 }}>
                                <Text style={estilos.inputLabel}>Momento</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {MOMENTOS_ORDEN.map(m => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[estilos.momentoChip, momento === m && estilos.momentoChipActivo]}
                                                onPress={() => setMomento(m)}
                                            >
                                                <Text style={[estilos.momentoChipTxt, momento === m && { color: '#fff' }]}>
                                                    {MOMENTOS_LABEL[m]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[estilos.modalBtn, guardando && { opacity: 0.6 }]}
                            onPress={guardarRegistro}
                            disabled={guardando}
                        >
                            {guardando
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={estilos.modalBtnTxt}>Guardar</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ paddingVertical: 14, alignItems: 'center' }}
                            onPress={() => { setModalManual(false); setAlimSel(null); setBusqueda(''); }}
                        >
                            <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
    contenedor:   { flex: 1, backgroundColor: FONDO },
    cargandoBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    cargandoTxt:  { color: SUBTXT, fontSize: 14 },

    // Selector días
    diasRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: BORDE,
    },
    diaBtn:        { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: CARD2 },
    diaBtnActivo:  { backgroundColor: AZUL },
    diaBtnHoy:     { borderWidth: 1, borderColor: AZUL },
    diaTxt:        { color: SUBTXT, fontSize: 13, fontWeight: '600' },
    diaTxtActivo:  { color: '#fff' },

    // Sin plan
    sinPlanBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
    sinPlanEmoji: { fontSize: 60 },
    sinPlanTitulo:{ color: TEXTO, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    sinPlanDesc:  { color: SUBTXT, fontSize: 14, textAlign: 'center', lineHeight: 22 },
    sinPlanBtn:   { backgroundColor: AZUL, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
    sinPlanBtnTxt:{ color: '#fff', fontSize: 15, fontWeight: '700' },

    // Estrategia
    estrategiaCard:    { margin: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    estrategiaTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    estrategiaIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center' },
    estrategiaDia:     { color: AZUL, fontSize: 16, fontWeight: '800', marginBottom: 2 },
    estrategiaTipo:    { color: TEXTO, fontSize: 13, fontWeight: '600' },
    faseBadge:         { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    faseTxt:           { fontSize: 11, fontWeight: '700' },
    estrategiaDesc:    { color: SUBTXT, fontSize: 13, lineHeight: 20, marginBottom: 12 },
    estadoRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    estadoLabel:       { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    estadoBadge:       { backgroundColor: VERDE + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: VERDE + '40' },
    estadoTxt:         { color: VERDE, fontSize: 11, fontWeight: '700' },

    // Macros
    seccionTitulo: { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 14 },
    macrosCard:    { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    macrosGrid:    { flexDirection: 'row', justifyContent: 'space-between' },
    macroItem:     { alignItems: 'center', flex: 1 },
    macroIcono:    { fontSize: 22, marginBottom: 6 },
    macroValor:    { fontSize: 22, fontWeight: '800' },
    macroUnidad:   { color: SUBTXT, fontSize: 10, marginTop: -2 },
    macroLabel:    { color: SUBTXT, fontSize: 11, marginTop: 3 },

    // Progreso
    progresoCard:  { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, paddingVertical: 4, borderWidth: 1, borderColor: BORDE },
    progresoRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    progresoLabel: { color: SUBTXT, fontSize: 12, width: 80 },
    progresoReal:  { color: TEXTO, fontSize: 13, fontWeight: '700' },
    progresoObj:   { color: SUBTXT, fontSize: 12 },

    // Plan comidas
    planHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 6, marginBottom: 8 },
    totalBadge:   { backgroundColor: CARD2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDE },
    totalTxt:     { color: TEXTO, fontSize: 12, fontWeight: '600' },

    comidaCard:    { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    comidaHeader:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    comidaBorde:   { width: 3, height: 32, borderRadius: 2 },
    comidaNombre:  { color: TEXTO, fontSize: 15, fontWeight: '700', flex: 1 },
    comidaHora:    { color: SUBTXT, fontSize: 11, marginTop: 2 },
    comidaKcal:    { color: SUBTXT, fontSize: 12 },
    chevron:       { color: SUBTXT, fontSize: 14, fontWeight: '700' },
    comidaBody:    { paddingHorizontal: 14, paddingBottom: 14 },

    ingredienteRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    ingredienteNombre:  { color: TEXTO, fontSize: 14, fontWeight: '600' },
    pesoCrudo:          { color: NARANJA, fontSize: 10, fontWeight: '700', marginTop: 2 },
    ingredienteCantidad:{ color: AZUL, fontSize: 15, fontWeight: '700' },

    macrosComidaRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
    macroComidaLabel:      { color: SUBTXT, fontSize: 11, fontWeight: '700' },
    macroComidaVal:        { color: TEXTO, fontSize: 13, fontWeight: '700', marginRight: 4 },
    macroComidaValAzul:    { color: AZUL,   fontSize: 13, fontWeight: '700', marginRight: 4 },
    macroComidaValNaranja: { color: NARANJA,fontSize: 13, fontWeight: '700', marginRight: 4 },
    sep:                   { width: 1, height: 12, backgroundColor: BORDE, marginHorizontal: 2 },

    sinComidasBox: { marginHorizontal: 16, padding: 24, alignItems: 'center' },
    sinComidasTxt: { color: SUBTXT, fontSize: 14 },

    // FABs
    fab:        { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 8 },
    fabAzul:    { bottom: 100, backgroundColor: AZUL },
    fabNaranja: { bottom: 164, backgroundColor: NARANJA },
    fabIcono:   { fontSize: 22 },

    // Modal
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    bottomSheet:   { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDE, maxHeight: '85%' },
    sheetHandle:   { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo:   { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 14 },
    buscadorRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    buscadorInput: { flex: 1, backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 12, fontSize: 14 },
    resultadoItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDE },
    resultadoNombre:  { color: TEXTO, fontSize: 14, fontWeight: '600' },
    resultadoDetalle: { color: SUBTXT, fontSize: 12, marginTop: 2 },
    alimSelCard:   { backgroundColor: AZUL + '10', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: AZUL + '30' },
    inputLabel:    { color: SUBTXT, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
    inputCampo:    { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, borderRadius: 10, padding: 12, color: TEXTO, fontSize: 14 },
    momentoChip:      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE },
    momentoChipActivo:{ backgroundColor: AZUL, borderColor: AZUL },
    momentoChipTxt:   { color: SUBTXT, fontSize: 12, fontWeight: '600' },
    modalBtn:      { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
    modalBtnTxt:   { color: '#fff', fontSize: 15, fontWeight: '700' },
});