import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, Dimensions
} from 'react-native';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import HeaderForja from '../components/HeaderForja';

const { width: ANCHO } = Dimensions.get('window');

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
const ROSA    = '#f472b6';

// ─── Heatmap muscular SVG ─────────────────────────────────────────────────────
function HeatmapMuscular({ gruposFatiga = [], gruposListos = [] }) {
    function colorZona(zona) {
        const z = zona.toLowerCase();
        if (gruposFatiga.some(g => g.toLowerCase().includes(z) || z.includes(g.toLowerCase()))) return NARANJA;
        if (gruposListos.some(g => g.toLowerCase().includes(z) || z.includes(g.toLowerCase()))) return AZUL;
        return '#2a2a2a';
    }
    function opac(zona) {
        const c = colorZona(zona);
        return c === NARANJA ? 0.85 : c === AZUL ? 0.6 : 0.3;
    }

    return (
        <View style={estilos.heatmapContenedor}>
            <Svg width="100%" height={280} viewBox="0 0 200 320">
                {/* Cabeza */}
                <Ellipse cx="100" cy="28" rx="22" ry="26" fill="#2e2e2e" />
                {/* Cuello */}
                <Path d="M90 52 Q100 48 110 52 L108 68 Q100 64 92 68 Z" fill="#2e2e2e" />
                {/* Hombros */}
                <Ellipse cx="70"  cy="80" rx="18" ry="12" fill={colorZona('hombro')} opacity={opac('hombro')} />
                <Ellipse cx="130" cy="80" rx="18" ry="12" fill={colorZona('hombro')} opacity={opac('hombro')} />
                {/* Pecho */}
                <Path d="M82 68 Q100 62 118 68 L120 100 Q100 108 80 100 Z" fill={colorZona('pecho')} opacity={opac('pecho')} />
                {/* Abdomen */}
                <Path d="M83 100 Q100 108 117 100 L115 145 Q100 150 85 145 Z" fill={colorZona('abdomen')} opacity={opac('abdomen')} />
                {/* Brazos superiores */}
                <Path d="M62 74 Q52 78 48 100 Q50 112 60 114 Q68 110 72 96 Z"   fill={colorZona('biceps')} opacity={opac('biceps')} />
                <Path d="M138 74 Q148 78 152 100 Q150 112 140 114 Q132 110 128 96 Z" fill={colorZona('biceps')} opacity={opac('biceps')} />
                {/* Antebrazos */}
                <Path d="M48 100 Q42 118 44 138 Q50 142 56 138 Q60 118 60 114 Z"     fill="#2a2a2a" opacity={0.5} />
                <Path d="M152 100 Q158 118 156 138 Q150 142 144 138 Q140 118 140 114 Z" fill="#2a2a2a" opacity={0.5} />
                {/* Manos */}
                <Ellipse cx="46"  cy="145" rx="8" ry="10" fill="#2a2a2a" opacity={0.4} />
                <Ellipse cx="154" cy="145" rx="8" ry="10" fill="#2a2a2a" opacity={0.4} />
                {/* Espalda baja */}
                <Path d="M85 145 Q100 150 115 145 L113 168 Q100 172 87 168 Z" fill={colorZona('espalda')} opacity={opac('espalda') * 0.7} />
                {/* Glúteos */}
                <Path d="M87 168 Q100 172 113 168 L115 195 Q100 202 85 195 Z" fill={colorZona('gluteo')} opacity={opac('gluteo')} />
                {/* Cuádriceps */}
                <Path d="M88 195 Q82 198 78 225 Q80 240 88 242 Q96 240 96 215 Z"   fill={colorZona('piernas')} opacity={opac('piernas')} />
                <Path d="M112 195 Q118 198 122 225 Q120 240 112 242 Q104 240 104 215 Z" fill={colorZona('piernas')} opacity={opac('piernas')} />
                {/* Isquiotibiales */}
                <Path d="M88 242 Q84 260 86 278 Q92 282 96 278 Q100 262 96 242 Z"    fill={colorZona('isquiotibiales')} opacity={opac('isquiotibiales') * 0.8} />
                <Path d="M112 242 Q116 260 114 278 Q108 282 104 278 Q100 262 104 242 Z" fill={colorZona('isquiotibiales')} opacity={opac('isquiotibiales') * 0.8} />
                {/* Gemelos */}
                <Ellipse cx="90"  cy="298" rx="7" ry="14" fill="#2a2a2a" opacity={0.5} />
                <Ellipse cx="110" cy="298" rx="7" ry="14" fill="#2a2a2a" opacity={0.5} />
            </Svg>

            {/* Leyenda */}
            <View style={estilos.heatmapLeyenda}>
                <View style={estilos.leyendaItem}>
                    <View style={[estilos.leyendaDot, { backgroundColor: NARANJA }]} />
                    <Text style={estilos.leyendaTxt}>FATIGA: {gruposFatiga.join(', ').toUpperCase() || 'NINGUNA'}</Text>
                </View>
                <View style={estilos.leyendaItem}>
                    <View style={[estilos.leyendaDot, { backgroundColor: AZUL }]} />
                    <Text style={estilos.leyendaTxt}>LISTO: {gruposListos.join(', ').toUpperCase() || 'TODOS'}</Text>
                </View>
                <View style={estilos.sincronizadoBadge}>
                    <Text style={estilos.sincronizadoTxt}>Sincronizado: Hace 2m</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Widget Nutrición ─────────────────────────────────────────────────────────

function WidgetNutricion({ kcalConsumidas = 0, kcalObjetivo = 2100, prot = { real: 0, obj: 180 }, carbs = { real: 0, obj: 250 }, grasas = { real: 0, obj: 65 }, onPress }) {
    const pct = Math.min((kcalConsumidas / kcalObjetivo) * 100, 100);

    return (
        <TouchableOpacity style={estilos.widgetCard} onPress={onPress} activeOpacity={0.85}>
            <View style={estilos.widgetHeader}>
                <View style={estilos.widgetTituloRow}>
                    <Text style={estilos.widgetIcono}>🥗</Text>
                    <Text style={estilos.widgetTitulo}>Nutrición Diaria</Text>
                </View>
                <Text style={estilos.widgetFlecha}>↗</Text>
            </View>

            <View style={estilos.kcalRow}>
                <Text style={estilos.kcalNum}>{kcalConsumidas.toLocaleString()}</Text>
                <Text style={estilos.kcalTotal}> / {kcalObjetivo.toLocaleString()} kcal</Text>
            </View>

            {/* Barra progreso kcal */}
            <View style={estilos.kcalBarFondo}>
                <View style={[estilos.kcalBarRelleno, { width: `${pct}%` }]} />
            </View>

            {/* Macros */}
            <View style={estilos.macrosRow}>
                <View style={estilos.macroItem}>
                    <Text style={estilos.macroLabel}>PROT</Text>
                    <Text style={estilos.macroValor}>{prot.real}g / <Text style={estilos.macroObj}>{prot.obj}g</Text></Text>
                    <View style={estilos.macroBarFondo}>
                        <View style={[estilos.macroBarRelleno, { width: `${Math.min((prot.real / prot.obj) * 100, 100)}%`, backgroundColor: AZUL }]} />
                    </View>
                </View>
                <View style={estilos.macroItem}>
                    <Text style={estilos.macroLabel}>CARBS</Text>
                    <Text style={estilos.macroValor}>{carbs.real}g / <Text style={estilos.macroObj}>{carbs.obj}g</Text></Text>
                    <View style={estilos.macroBarFondo}>
                        <View style={[estilos.macroBarRelleno, { width: `${Math.min((carbs.real / carbs.obj) * 100, 100)}%`, backgroundColor: NARANJA }]} />
                    </View>
                </View>
                <View style={estilos.macroItem}>
                    <Text style={estilos.macroLabel}>GRASAS</Text>
                    <Text style={estilos.macroValor}>{grasas.real}g / <Text style={estilos.macroObj}>{grasas.obj}g</Text></Text>
                    <View style={estilos.macroBarFondo}>
                        <View style={[estilos.macroBarRelleno, { width: `${Math.min((grasas.real / grasas.obj) * 100, 100)}%`, backgroundColor: '#a78bfa' }]} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Widget Fase Hormonal (solo mujeres) ──────────────────────────────────────

function WidgetFaseHormonal({ fase = 'folicular', dia = 1, duracion = 28 }) {
    const CONFIG_FASES = {
        menstruacion: { color: ROJO,    label: 'MENSTRUACIÓN',    emoji: '🌑', extra: '-100 kcal', desc: 'Prioriza recuperación. Intensidad moderada recomendada.' },
        folicular:    { color: VERDE,   label: 'FASE FOLICULAR',  emoji: '🌱', extra: '+0 kcal',   desc: 'Energía en aumento. Ideal para entrenamientos de fuerza.' },
        ovulatoria:   { color: AZUL,    label: 'FASE OVULATORIA', emoji: '⚡', extra: '+50 kcal',  desc: 'Pico de energía. Máximo rendimiento disponible.' },
        lutea:        { color: NARANJA, label: 'FASE LÚTEA',      emoji: '🔥', extra: '+200 kcal', desc: 'Gasto energético elevado. Aumenta hidratación y grasas saludables.' },
    };

    const cfg = CONFIG_FASES[fase] || CONFIG_FASES.folicular;
    const PUNTOS = [1, 7, 14, 21, 28];

    return (
        <View style={[estilos.widgetCard, { borderColor: cfg.color + '40' }]}>
            <View style={estilos.faseHeader}>
                <View>
                    <Text style={[estilos.faseTitulo, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
                    <Text style={estilos.faseSubtitulo}>Gasto Energético {cfg.extra.startsWith('+') ? 'Elevado' : 'Reducido'}</Text>
                </View>
                <View style={[estilos.faseKcalBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '60' }]}>
                    <Text style={[estilos.faseKcalTxt, { color: cfg.color }]}>{cfg.extra}</Text>
                </View>
            </View>

            {/* Timeline del ciclo */}
            <View style={estilos.timelineContenedor}>
                {PUNTOS.map((p, i) => {
                    const activo = dia >= p && (i === PUNTOS.length - 1 || dia < PUNTOS[i + 1]);
                    return (
                        <View key={p} style={estilos.timelineItem}>
                            <View style={[
                                estilos.timelineDot,
                                activo && { backgroundColor: cfg.color, transform: [{ scale: 1.3 }] }
                            ]}>
                                {activo && <View style={{ position: 'absolute', top: -8 }}>
                                    <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '800' }}>HOY</Text>
                                </View>}
                            </View>
                            <Text style={estilos.timelineLabel}>D{p}</Text>
                        </View>
                    );
                })}
            </View>

            <Text style={estilos.faseDesc}>{cfg.desc}</Text>
        </View>
    );
}

// ─── Widgets Pasos + FC ───────────────────────────────────────────────────────

function WidgetMiniDual({ pasos = 0, pasosObjetivo = 10000, bpm = 0 }) {
    const pct = Math.min((pasos / pasosObjetivo) * 100, 100);
    // Mini barras de ritmo cardíaco simuladas
    const barras = [4, 7, 5, 9, 6, 8, 5, 7, 4, 8, 6, 9];

    return (
        <View style={estilos.miniDualRow}>
            {/* Pasos */}
            <View style={[estilos.miniCard, { borderColor: AZUL + '30' }]}>
                <View style={estilos.miniHeader}>
                    <Text style={estilos.miniIcono}>👣</Text>
                    <Text style={[estilos.miniDelta, { color: VERDE }]}>+12% ↗</Text>
                </View>
                <Text style={estilos.miniValor}>{pasos.toLocaleString()}</Text>
                <Text style={estilos.miniLabel}>PASOS HOY</Text>
                <View style={estilos.miniBarFondo}>
                    <View style={[estilos.miniBarRelleno, { width: `${pct}%`, backgroundColor: AZUL }]} />
                </View>
            </View>

            {/* FC */}
            <View style={[estilos.miniCard, { borderColor: ROJO + '30' }]}>
                <View style={estilos.miniHeader}>
                    <Text style={estilos.miniIcono}>❤️</Text>
                    <View style={estilos.liveBadge}>
                        <Text style={estilos.liveTxt}>LIVE</Text>
                    </View>
                </View>
                <Text style={estilos.miniValor}>{bpm}</Text>
                <Text style={estilos.miniLabel}>BPM  RITMO CARDÍACO</Text>
                {/* Mini gráfica de barras */}
                <View style={estilos.barrasRow}>
                    {barras.map((h, i) => (
                        <View key={i} style={[estilos.barra, { height: h * 3, backgroundColor: i === barras.length - 1 ? ROJO : '#3a1a1a' }]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
    const [perfil, setPerfil]       = useState(null);
    const [nutricion, setNutricion] = useState(null);
    const [medidas, setMedidas]     = useState(null);
    const [cargando, setCargando]   = useState(true);

    // Datos simulados para heatmap (se reemplazarán con datos reales del log_entreno)
    const [gruposFatiga] = useState(['piernas', 'gluteo']);
    const [gruposListos] = useState(['pecho', 'espalda', 'hombro']);

    useFocusEffect(useCallback(() => { cargarDatos(); }, []));

    async function cargarDatos() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [rPerfil, rNutricion, rMedidas] = await Promise.allSettled([
                axios.get(`${API_URL}/usuario/perfil.php`,            { headers, timeout: 10000 }),
                axios.get(`${API_URL}/nutricion/resumen-hoy.php`,     { headers, timeout: 10000 }),
                axios.get(`${API_URL}/medidas/ultima-medida.php`,     { headers, timeout: 10000 }),
            ]);

            if (rPerfil.status    === 'fulfilled') setPerfil(rPerfil.value.data);
            if (rNutricion.status === 'fulfilled') setNutricion(rNutricion.value.data);
            if (rMedidas.status   === 'fulfilled') setMedidas(rMedidas.value.data);
        } catch (e) {
            console.log('Error cargando dashboard:', e.message);
        } finally {
            setCargando(false);
        }
    }

    // Calcular fase del ciclo
    function calcularFase() {
        if (!perfil?.tiene_ciclo || !perfil?.fecha_ultimo_ciclo) return null;
        const inicio = new Date(perfil.fecha_ultimo_ciclo);
        const hoy    = new Date();
        const dia    = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24)) + 1;
        const duracion = perfil.duracion_ciclo || 28;

        if (dia <= 5)                     return { fase: 'menstruacion', dia, duracion };
        if (dia <= 13)                    return { fase: 'folicular',    dia, duracion };
        if (dia <= 16)                    return { fase: 'ovulatoria',   dia, duracion };
        if (dia <= duracion)              return { fase: 'lutea',        dia, duracion };
        return { fase: 'folicular', dia: 1, duracion };
    }

    const faseCiclo  = calcularFase();
    const esMujer    = perfil?.sexo === 'mujer';
    const potencial  = 92; // Se calculará con datos reales
    const nombre     = perfil?.nombre?.split(' ')[0] || 'Usuario';

    // Nutrición
    const kcalHoy    = nutricion?.kcal_consumidas   || 0;
    const kcalObj    = nutricion?.kcal_objetivo      || 2100;
    const protHoy    = nutricion?.proteinas_hoy      || 0;
    const protObj    = nutricion?.proteinas_objetivo || 180;
    const carbsHoy   = nutricion?.carbohidratos_hoy  || 0;
    const carbsObj   = nutricion?.carbohidratos_objetivo || 250;
    const grasasHoy  = nutricion?.grasas_hoy         || 0;
    const grasasObj  = nutricion?.grasas_objetivo    || 65;

    return (
        <View style={estilos.contenedor}>

            {/* ── HEADER ── */}
            <HeaderForja derecha={
                <View style={estilos.headerDer}>
                    <TouchableOpacity style={estilos.campanaBtnBox}>
                        <Text style={estilos.campanaIcono}>🔔</Text>
                        <View style={estilos.campanaBadge} />
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.avatarBox}>
                        {perfil?.foto_url
                            ? <Image source={{ uri: perfil.foto_url }} style={estilos.avatarImg} />
                            : <Text style={estilos.avatarLetra}>{nombre.charAt(0)}</Text>
                        }
                    </TouchableOpacity>
                </View>
            } />

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Saludo */}
                <View style={estilos.saludoContenedor}>
                    <View style={estilos.saludoRow}>
                        <Text style={estilos.saludoTxt}>Hola, <Text style={estilos.saludoNombre}>{nombre}</Text></Text>
                        <View style={estilos.hoySesionBadge}>
                            <Text style={estilos.hoySesionTxt}>Hoy: Leg Day</Text>
                        </View>
                    </View>
                    <Text style={estilos.saludoSub}>
                        Tu estado biológico está al{' '}
                        <Text style={[estilos.saludoPct, { color: AZUL }]}>{potencial}%</Text>
                        {' '}de potencial hoy.
                    </Text>
                </View>

                {/* ── ESTADO NEUROMUSCULAR ── */}
                <View style={estilos.seccionHeader}>
                    <View style={estilos.seccionTituloRow}>
                        <Text style={estilos.seccionIcono}>〜</Text>
                        <Text style={estilos.seccionTitulo}>ESTADO NEUROMUSCULAR</Text>
                    </View>
                    <TouchableOpacity>
                        <Text style={estilos.verDetalles}>Ver detalles ›</Text>
                    </TouchableOpacity>
                </View>

                <View style={estilos.heatmapCard}>
                    <HeatmapMuscular gruposFatiga={gruposFatiga} gruposListos={gruposListos} />
                </View>

                {/* ── MÉTRICAS CRÍTICAS ── */}
                <Text style={estilos.metricasTitulo}>MÉTRICAS CRÍTICAS</Text>

                {/* Widget Nutrición */}
                <WidgetNutricion
                    kcalConsumidas={kcalHoy}
                    kcalObjetivo={kcalObj}
                    prot={{ real: protHoy, obj: protObj }}
                    carbs={{ real: carbsHoy, obj: carbsObj }}
                    grasas={{ real: grasasHoy, obj: grasasObj }}
                    onPress={() => navigation.navigate('Nutricion')}
                />

                {/* Widget Fase Hormonal — solo mujeres */}
                {esMujer && faseCiclo && (
                    <WidgetFaseHormonal
                        fase={faseCiclo.fase}
                        dia={faseCiclo.dia}
                        duracion={faseCiclo.duracion}
                    />
                )}

                {/* Widgets mini — Pasos + FC */}
                <WidgetMiniDual
                    pasos={8432}
                    pasosObjetivo={10000}
                    bpm={68}
                />

                {/* Sugerencia FORJA IA */}
                <View style={estilos.sugerenciaCard}>
                    <View style={estilos.sugerenciaHeader}>
                        <View style={estilos.sugerenciaIconBox}>
                            <Text style={estilos.sugerenciaIcono}>ℹ</Text>
                        </View>
                        <Text style={estilos.sugerenciaTitulo}>Sugerencia FORJA IA</Text>
                    </View>
                    <Text style={estilos.sugerenciaTxt}>
                        Detectamos fatiga acumulada en isquiotibiales. Considera 5 min extra de liberación miofascial antes del entrenamiento.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
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
        backgroundColor: FONDO,
    },
    headerLogoBox: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: BORDE,
    },
    headerLogo: { fontSize: 20 },
    headerDer:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
    campanaBtnBox: { position: 'relative' },
    campanaIcono:  { fontSize: 22 },
    campanaBadge: {
        position: 'absolute', top: -2, right: -2,
        width: 8, height: 8, borderRadius: 4, backgroundColor: ROJO,
    },
    avatarBox: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', borderWidth: 2, borderColor: AZUL + '60',
    },
    avatarImg:    { width: 38, height: 38 },
    avatarLetra:  { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Saludo
    saludoContenedor: { paddingHorizontal: 20, paddingBottom: 16 },
    saludoRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    saludoTxt:    { color: TEXTO, fontSize: 28, fontWeight: '800' },
    saludoNombre: { color: TEXTO },
    hoySesionBadge: {
        backgroundColor: CARD2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
        borderWidth: 1, borderColor: BORDE,
    },
    hoySesionTxt: { color: SUBTXT, fontSize: 12, fontWeight: '600' },
    saludoSub:    { color: SUBTXT, fontSize: 14, lineHeight: 22 },
    saludoPct:    { fontWeight: '800' },

    // Sección header
    seccionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 12, marginTop: 4,
    },
    seccionTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seccionIcono:     { color: AZUL, fontSize: 14 },
    seccionTitulo:    { color: TEXTO, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    verDetalles:      { color: AZUL, fontSize: 13, fontWeight: '600' },

    // Heatmap
    heatmapCard: {
        marginHorizontal: 16, marginBottom: 24,
        backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: BORDE,
    },
    heatmapContenedor: { padding: 12 },
    heatmapLeyenda: {
        flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        paddingHorizontal: 4, paddingBottom: 4, marginTop: 8,
    },
    leyendaItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    leyendaDot:   { width: 10, height: 10, borderRadius: 5 },
    leyendaTxt:   { color: SUBTXT, fontSize: 11, fontWeight: '600' },
    sincronizadoBadge: {
        marginLeft: 'auto', backgroundColor: AZUL + '20',
        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    },
    sincronizadoTxt: { color: AZUL, fontSize: 10, fontWeight: '600' },

    // Métricas
    metricasTitulo: {
        color: TEXTO, fontSize: 13, fontWeight: '800', letterSpacing: 1,
        paddingHorizontal: 20, marginBottom: 14,
    },

    // Widget base
    widgetCard: {
        marginHorizontal: 16, marginBottom: 14,
        backgroundColor: CARD, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: BORDE,
    },
    widgetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    widgetTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    widgetIcono:     { fontSize: 18 },
    widgetTitulo:    { color: TEXTO, fontSize: 15, fontWeight: '700' },
    widgetFlecha:    { color: SUBTXT, fontSize: 18 },

    // Nutrición
    kcalRow:      { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
    kcalNum:      { color: TEXTO, fontSize: 32, fontWeight: '800' },
    kcalTotal:    { color: SUBTXT, fontSize: 16 },
    kcalBarFondo: { height: 4, backgroundColor: BORDE, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
    kcalBarRelleno: { height: 4, backgroundColor: AZUL, borderRadius: 2 },
    macrosRow:    { flexDirection: 'row', gap: 8 },
    macroItem:    { flex: 1 },
    macroLabel:   { color: SUBTXT, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
    macroValor:   { color: TEXTO, fontSize: 12, fontWeight: '700', marginBottom: 4 },
    macroObj:     { color: SUBTXT, fontWeight: '400' },
    macroBarFondo:  { height: 3, backgroundColor: BORDE, borderRadius: 2, overflow: 'hidden' },
    macroBarRelleno:{ height: 3, borderRadius: 2 },

    // Fase hormonal
    faseHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    faseTitulo:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
    faseSubtitulo:{ color: TEXTO, fontSize: 15, fontWeight: '700' },
    faseKcalBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    faseKcalTxt:   { fontSize: 13, fontWeight: '800' },
    timelineContenedor: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    timelineItem:  { alignItems: 'center', gap: 6 },
    timelineDot:   { width: 12, height: 12, borderRadius: 6, backgroundColor: BORDE, marginTop: 10 },
    timelineLabel: { color: SUBTXT, fontSize: 10 },
    faseDesc:      { color: SUBTXT, fontSize: 13, lineHeight: 20 },

    // Mini widgets
    miniDualRow:   { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 14 },
    miniCard: {
        flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: BORDE,
    },
    miniHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    miniIcono:   { fontSize: 20 },
    miniDelta:   { fontSize: 12, fontWeight: '700' },
    miniValor:   { color: TEXTO, fontSize: 28, fontWeight: '800', marginBottom: 2 },
    miniLabel:   { color: SUBTXT, fontSize: 10, fontWeight: '600', marginBottom: 8 },
    miniBarFondo:  { height: 3, backgroundColor: BORDE, borderRadius: 2, overflow: 'hidden' },
    miniBarRelleno:{ height: 3, borderRadius: 2 },
    liveBadge:    { backgroundColor: ROJO + '25', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: ROJO + '50' },
    liveTxt:      { color: ROJO, fontSize: 9, fontWeight: '800' },
    barrasRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 30, marginTop: 4 },
    barra:        { flex: 1, borderRadius: 2 },

    // Sugerencia IA
    sugerenciaCard: {
        marginHorizontal: 16, marginBottom: 14,
        backgroundColor: CARD, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: AZUL + '30',
    },
    sugerenciaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    sugerenciaIconBox: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: AZUL + '40',
    },
    sugerenciaIcono: { color: AZUL, fontSize: 14, fontWeight: '800' },
    sugerenciaTitulo:{ color: TEXTO, fontSize: 15, fontWeight: '700' },
    sugerenciaTxt:   { color: SUBTXT, fontSize: 13, lineHeight: 20 },
});