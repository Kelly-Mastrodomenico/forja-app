import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
const ROSA    = '#f472b6';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
const MOMENTOS_HORA = {
    desayuno:     '08:00',
    media_manana: '11:00',
    almuerzo:     '13:30',
    merienda:     '17:00',
    pre_entreno:  '18:30',
    post_entreno: '20:30',
    cena:         '21:00',
};

// Calcular macros objetivo del día
function calcularMacrosObjetivo(perfil, esDiaEntreno, faseHormonal) {
    if (!perfil) return { calorias: 2000, proteinas: 150, carbos: 230, grasas: 65 };

    const peso   = parseFloat(perfil.peso_actual || perfil.ultima_medida?.peso_kg || 70);
    const altura = parseFloat(perfil.altura_cm || 170);
    const sexo   = perfil.sexo || 'hombre';
    const nivel  = perfil.nivel || 'intermedio';

    // ── TMB (Mifflin-St Jeor) ──────────────────────────────────────────────
    let tmb;
    if (sexo === 'mujer') {
        tmb = 10 * peso + 6.25 * altura - 5 * 30 - 161;
    } else {
        tmb = 10 * peso + 6.25 * altura - 5 * 30 + 5;
    }

    // ── Factor de actividad ────────────────────────────────────────────────
    const factorActividad = { principiante: 1.375, intermedio: 1.55, avanzado: 1.725 };
    let tdee = tmb * (factorActividad[nivel] || 1.55);

    // ── Ajuste por objetivo ────────────────────────────────────────────────
    const objetivo = perfil.objetivo || 'mantenimiento';
    if (objetivo === 'perder_grasa')    tdee -= 300;
    if (objetivo === 'ganar_musculo')   tdee += 200;
    if (objetivo === 'recomposicion')   tdee -= 100;

    // ── Ajuste día de entreno (+10-15% kcal) ──────────────────────────────
    let ajusteEntreno = 0;
    let labelEntreno  = null;
    if (esDiaEntreno) {
        ajusteEntreno = Math.round(tdee * 0.15);
        tdee         += ajusteEntreno;
        labelEntreno  = '+15% kcal';
    }

    // ── Ajuste fase hormonal ───────────────────────────────────────────────
    let ajusteCiclo = 0;
    let labelCiclo  = null;
    if (faseHormonal === 'lutea') {
        ajusteCiclo = 200;
        tdee       += ajusteCiclo;
        labelCiclo  = 'Fase Lútea (+200 kcal)';
    } else if (faseHormonal === 'menstrual') {
        ajusteCiclo = -100;
        tdee       += ajusteCiclo;
        labelCiclo  = 'Fase Menstrual (-100 kcal)';
    } else if (faseHormonal === 'folicular') {
        labelCiclo = 'Folicular';
    } else if (faseHormonal === 'ovulatoria') {
        ajusteCiclo = 100;
        tdee       += ajusteCiclo;
        labelCiclo  = 'Ovulatoria (+100 kcal)';
    }

    // ── Distribución de macros ─────────────────────────────────────────────
    let pctProt, pctCarbs, pctGrasas;
    if (objetivo === 'perder_grasa') {
        pctProt = 0.35; pctCarbs = 0.40; pctGrasas = 0.25;
    } else if (objetivo === 'ganar_musculo') {
        pctProt = 0.30; pctCarbs = 0.50; pctGrasas = 0.20;
    } else {
        pctProt = 0.30; pctCarbs = 0.45; pctGrasas = 0.25;
    }

    const proteinas = Math.round((tdee * pctProt) / 4);
    const carbos    = Math.round((tdee * pctCarbs) / 4);
    const grasas    = Math.round((tdee * pctGrasas) / 9);

    return {
        calorias:     Math.round(tdee),
        proteinas,
        carbos,
        grasas,
        labelEntreno,
        labelCiclo,
        faseHormonal,
    };
}

// Calcular fase hormonal según fecha último ciclo
function calcularFaseHormonal(perfil) {
    if (!perfil?.tiene_ciclo || !perfil?.fecha_ultimo_ciclo) return null;
    const inicio     = new Date(perfil.fecha_ultimo_ciclo);
    const hoy        = new Date();
    const diasCiclo  = perfil.duracion_ciclo || 28;
    const diff       = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    const diaActual  = diff % diasCiclo;

    if (diaActual <= 5)               return 'menstrual';
    if (diaActual <= 13)              return 'folicular';
    if (diaActual <= 16)              return 'ovulatoria';
    return 'lutea';
}

// Formatear fecha como DD / MM / YYYY
function formatFecha(fecha) {
    const d = new Date(fecha + 'T12:00:00');
    return `${String(d.getDate()).padStart(2,'0')} / ${String(d.getMonth()+1).padStart(2,'0')} / ${d.getFullYear()}`;
}

// ─── Componente barra de macro ─────────────────────────────────────────────
function BarraMacro({ actual, objetivo, color }) {
    const pct = objetivo > 0 ? Math.min((actual / objetivo) * 100, 100) : 0;
    return (
        <View style={barraEstilos.fondo}>
            <View style={[barraEstilos.relleno, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
    );
}
const barraEstilos = StyleSheet.create({
    fondo:   { height: 3, backgroundColor: '#2a2a2a', borderRadius: 2, overflow: 'hidden' },
    relleno: { height: 3, borderRadius: 2 },
});

// ─── Card de una comida ────────────────────────────────────────────────────
function ComidaCard({ momento, items, macrosComida }) {
    const [expandido, setExpandido] = useState(false);
    const hayItems = items.length > 0;

    return (
        <View style={estilos.comidaCard}>
            <TouchableOpacity
                style={estilos.comidaHeader}
                onPress={() => setExpandido(!expandido)}
                activeOpacity={0.8}
            >
                <View style={estilos.comidaHeaderIzq}>
                    <View style={[estilos.comidaBorde, { backgroundColor: hayItems ? AZUL : BORDE }]} />
                    <View>
                        <Text style={estilos.comidaNombre}>{MOMENTOS_LABEL[momento]}</Text>
                        <Text style={estilos.comidaHora}>⏱ {MOMENTOS_HORA[momento]}</Text>
                    </View>
                </View>
                <Text style={estilos.chevron}>{expandido ? '∧' : '∨'}</Text>
            </TouchableOpacity>

            {expandido && (
                <View style={estilos.comidaBody}>
                    {hayItems ? (
                        <>
                            {items.map((item, i) => (
                                <View key={i} style={estilos.ingredienteRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={estilos.ingredienteNombre}>{item.nombre}</Text>
                                        {item.marca && <Text style={estilos.ingredienteMarca}>{item.marca}</Text>}
                                        <Text style={estilos.pesoCrudo}>PESO CRUDO</Text>
                                    </View>
                                    <Text style={estilos.ingredienteCantidad}>{item.cantidad_gramos}g</Text>
                                </View>
                            ))}
                            {/* Macros de la comida */}
                            <View style={estilos.macrosComidaRow}>
                                <Text style={estilos.macroComidaLabel}>PRO</Text>
                                <Text style={estilos.macroComidaVal}>{macrosComida.proteinas}g</Text>
                                <View style={estilos.macroComidaSep} />
                                <Text style={estilos.macroComidaLabel}>CHO</Text>
                                <Text style={estilos.macroComidaValNaranja}>{macrosComida.carbos}g</Text>
                                <View style={estilos.macroComidaSep} />
                                <Text style={estilos.macroComidaLabel}>FAT</Text>
                                <Text style={estilos.macroComidaVal}>{macrosComida.grasas}g</Text>
                                <View style={{ flex: 1 }} />
                                <Text style={estilos.macroComidaKcal}>{macrosComida.calorias} kcal</Text>
                            </View>
                            <View style={estilos.barrasComida}>
                                <BarraMacro actual={macrosComida.proteinas} objetivo={40}  color={AZUL} />
                                <BarraMacro actual={macrosComida.carbos}    objetivo={80}  color={NARANJA} />
                                <BarraMacro actual={macrosComida.grasas}    objetivo={20}  color={'#a855f7'} />
                            </View>
                        </>
                    ) : (
                        <Text style={estilos.comidaVacia}>Sin registros para este momento</Text>
                    )}
                </View>
            )}
        </View>
    );
}

// ─── Pantalla principal ────────────────────────────────────────────────────
export default function NutricionScreen({ navigation }) {
    const [fecha, setFecha]               = useState(new Date().toISOString().split('T')[0]);
    const [perfil, setPerfil]             = useState(null);
    const [comidas, setComidas]           = useState([]);
    const [totales, setTotales]           = useState({ calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
    const [diaEntreno, setDiaEntreno]     = useState(false);
    const [nombreDia, setNombreDia]       = useState('');
    const [cargando, setCargando]         = useState(true);

    // Modal registro manual
    const [modalManual, setModalManual]   = useState(false);
    const [busqueda, setBusqueda]         = useState('');
    const [resultados, setResultados]     = useState([]);
    const [buscando, setBuscando]         = useState(false);
    const [alimSel, setAlimSel]           = useState(null);
    const [cantidad, setCantidad]         = useState('100');
    const [momento, setMomento]           = useState('almuerzo');
    const [guardando, setGuardando]       = useState(false);

    useFocusEffect(useCallback(() => {
        cargarDatos(fecha);
    }, [fecha]));

    async function cargarDatos(fechaCarga) {
        setCargando(true);
        try {
            const token   = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [rPerfil, rDiario, rPlan] = await Promise.all([
                axios.get(`${API_URL}/usuario/perfil.php`, { headers, timeout: 10000 }),
                axios.get(`${API_URL}/nutricion/diario.php?fecha=${fechaCarga}`, { headers, timeout: 10000 }),
                axios.get(`${API_URL}/rutina/obtener-rutina.php`, { headers, timeout: 10000 }).catch(() => null),
            ]);

            if (rPerfil.data) setPerfil(rPerfil.data);
            if (rDiario.data?.comidas) {
                setComidas(rDiario.data.comidas);
                setTotales(rDiario.data.totales || {});
            }

            // Verificar si hoy es día de entreno
            if (rPlan?.data?.semanas) {
                const hoyDiaSemana = new Date().getDay(); // 0=Dom,1=Lun...
                // Convertir: JS usa 0=Dom, nosotros 0=Lun
                const diaSemanaForja = hoyDiaSemana === 0 ? 6 : hoyDiaSemana - 1;
                const semana1 = rPlan.data.semanas[0];
                const diaHoy  = semana1?.dias?.find(d => d.dia_semana === diaSemanaForja);
                if (diaHoy) {
                    setDiaEntreno(true);
                    setNombreDia(diaHoy.dia_nombre?.split(':')[0] || 'Día de Entreno');
                } else {
                    setDiaEntreno(false);
                    setNombreDia('Día de Descanso');
                }
            }
        } catch (e) {
            console.log('Error nutrición:', e.message);
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
        } catch {
            setResultados([]);
        } finally {
            setBuscando(false);
        }
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
                {
                    alimento_id:    alimSel.id,
                    cantidad_gramos: parseFloat(cantidad),
                    momento,
                    fecha,
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            setModalManual(false);
            setBusqueda(''); setResultados([]); setAlimSel(null); setCantidad('100');
            await cargarDatos(fecha);
            Alert.alert('✅', 'Alimento registrado.');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'No se pudo registrar.');
        } finally {
            setGuardando(false);
        }
    }

    // ── Calcular macros objetivo ──────────────────────────────────────────
    const faseHormonal = calcularFaseHormonal(perfil);
    const macrosObj    = calcularMacrosObjetivo(perfil, diaEntreno, faseHormonal);

    // ── Agrupar comidas por momento ───────────────────────────────────────
    const comidasPorMomento = {};
    for (const c of comidas) {
        if (!comidasPorMomento[c.momento]) comidasPorMomento[c.momento] = [];
        comidasPorMomento[c.momento].push(c);
    }

    // Calcular macros por comida
    function macrosDeMomento(items) {
        let cal = 0, prot = 0, carbs = 0, fat = 0;
        for (const it of items) {
            const f = it.cantidad_gramos / 100;
            cal  += (it.calorias_100g       || 0) * f;
            prot += (it.proteinas_100g      || 0) * f;
            carbs+= (it.carbohidratos_100g  || 0) * f;
            fat  += (it.grasas_100g         || 0) * f;
        }
        return { calorias: Math.round(cal), proteinas: Math.round(prot), carbos: Math.round(carbs), grasas: Math.round(fat) };
    }

    const pctCal   = macrosObj.calorias    > 0 ? Math.min((totales.calorias    / macrosObj.calorias)    * 100, 100) : 0;
    const pctProt  = macrosObj.proteinas   > 0 ? Math.min((totales.proteinas   / macrosObj.proteinas)   * 100, 100) : 0;
    const pctCarbs = macrosObj.carbos      > 0 ? Math.min(((totales.carbohidratos || 0) / macrosObj.carbos)  * 100, 100) : 0;
    const pctGrasa = macrosObj.grasas      > 0 ? Math.min((totales.grasas      / macrosObj.grasas)      * 100, 100) : 0;

    return (
        <View style={estilos.contenedor}>

            {/* Header lo pone TabNavigator con logo FORJA */}

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── SELECTOR DE FECHA ── */}
                <View style={estilos.fechaRow}>
                    <TouchableOpacity
                        style={estilos.fechaFlechaBtn}
                        onPress={() => {
                            const d = new Date(fecha + 'T12:00:00');
                            d.setDate(d.getDate() - 1);
                            setFecha(d.toISOString().split('T')[0]);
                        }}
                    >
                        <Text style={estilos.fechaFlechaTxt}>‹</Text>
                    </TouchableOpacity>

                    <View style={estilos.fechaBtn}>
                        <Text style={estilos.fechaTxt}>{formatFecha(fecha)}</Text>
                        <Text style={estilos.fechaIcono}>📅</Text>
                    </View>

                    <TouchableOpacity
                        style={estilos.fechaFlechaBtn}
                        onPress={() => {
                            const d   = new Date(fecha + 'T12:00:00');
                            const hoy = new Date();
                            d.setDate(d.getDate() + 1);
                            if (d <= hoy) setFecha(d.toISOString().split('T')[0]);
                        }}
                    >
                        <Text style={estilos.fechaFlechaTxt}>›</Text>
                    </TouchableOpacity>
                </View>

                {cargando ? (
                    <View style={estilos.cargandoBox}>
                        <ActivityIndicator color={AZUL} size="large" />
                    </View>
                ) : (
                    <>
                        {/* ── CARD ESTRATEGIA DEL DÍA ── */}
                        <View style={estilos.estrategiaCard}>
                            <View style={estilos.estrategiaTop}>
                                <View style={estilos.estrategiaIconBox}>
                                    <Text style={estilos.estrategiaIcono}>{diaEntreno ? '🔥' : '💤'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.estrategiaDia}>
                                        {nombreDia || (diaEntreno ? 'Día de Entreno' : 'Día de Descanso')}
                                    </Text>
                                    <Text style={estilos.estrategiaTipo}>
                                        {diaEntreno ? 'Alta Recarga de Carbohidratos' : 'Carbohidratos Moderados'}
                                    </Text>
                                </View>
                                {macrosObj.labelEntreno && (
                                    <View style={estilos.estrategiaBadge}>
                                        <Text style={estilos.estrategiaBadgeTxt}>🍗 {macrosObj.labelEntreno}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={estilos.estrategiaDesc}>
                                {diaEntreno
                                    ? 'Estrategia Pendular: aumento de glucógeno para maximizar el rendimiento. +45g CHO en pre-entreno.'
                                    : 'Día de recuperación: carbohidratos reducidos, proteína alta para preservar músculo.'}
                            </Text>
                            <View style={estilos.estadoMetaRow}>
                                <Text style={estilos.estadoMetaLabel}>ESTADO METABÓLICO</Text>
                                <View style={estilos.estadoMetaBadge}>
                                    <Text style={estilos.estadoMetaTxt}>
                                        {diaEntreno ? 'Anabólico Optimizado' : 'Recuperación Activa'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* ── CARD MACROS DEL DÍA ── */}
                        <View style={estilos.macrosCard}>
                            <View style={estilos.macrosHeaderRow}>
                                <Text style={estilos.macrosCardTitulo}>MACROS DEL DÍA</Text>
                                <View style={estilos.macrosAjusteRow}>
                                    {diaEntreno && (
                                        <View style={estilos.macrosAjusteBadge}>
                                            <Text style={estilos.macrosAjusteTxt}>🍗 {nombreDia} ({macrosObj.labelEntreno})</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* 4 columnas de macros */}
                            <View style={estilos.macrosGrid}>
                                <View style={estilos.macroItem}>
                                    <Text style={estilos.macroEmoji}>🔥</Text>
                                    <Text style={estilos.macroValor}>{macrosObj.calorias}</Text>
                                    <Text style={estilos.macroUnidad}>kcal</Text>
                                    <Text style={estilos.macroLabel}>Calorías</Text>
                                </View>
                                <View style={estilos.macroItem}>
                                    <Text style={estilos.macroEmoji}>🥩</Text>
                                    <Text style={estilos.macroValor}>{macrosObj.proteinas}</Text>
                                    <Text style={estilos.macroUnidad}>g</Text>
                                    <Text style={estilos.macroLabel}>Proteínas</Text>
                                </View>
                                <View style={estilos.macroItem}>
                                    <Text style={estilos.macroEmoji}>🌾</Text>
                                    <Text style={estilos.macroValor}>{macrosObj.carbos}</Text>
                                    <Text style={estilos.macroUnidad}>g</Text>
                                    <Text style={estilos.macroLabel}>Carbos</Text>
                                </View>
                                <View style={estilos.macroItem}>
                                    <Text style={estilos.macroEmoji}>💧</Text>
                                    <Text style={estilos.macroValor}>{macrosObj.grasas}</Text>
                                    <Text style={estilos.macroUnidad}>g</Text>
                                    <Text style={estilos.macroLabel}>Grasas</Text>
                                </View>
                            </View>

                            {/* Ajuste ciclo hormonal */}
                            {macrosObj.labelCiclo && (
                                <View style={estilos.cicloRow}>
                                    <Text style={estilos.cicloLabel}>Ajuste ciclo: </Text>
                                    <Text style={estilos.cicloVal}>{macrosObj.labelCiclo}</Text>
                                </View>
                            )}
                        </View>

                        {/* ── CARD PROGRESO DEL DÍA ── */}
                        <View style={estilos.progresoCard}>
                            <Text style={estilos.progresoTitulo}>PROGRESO DEL DÍA</Text>

                            {[
                                { label: 'Calorías',         actual: Math.round(totales.calorias    || 0), obj: macrosObj.calorias,  unidad: '' },
                                { label: 'Proteínas (g)',    actual: Math.round(totales.proteinas   || 0), obj: macrosObj.proteinas, unidad: 'g', color: AZUL },
                                { label: 'Carbohidratos (g)',actual: Math.round(totales.carbohidratos||0), obj: macrosObj.carbos,    unidad: 'g', color: NARANJA },
                                { label: 'Grasas (g)',       actual: Math.round(totales.grasas      || 0), obj: macrosObj.grasas,    unidad: 'g', color: '#a855f7' },
                            ].map((m, i) => {
                                const pct = m.obj > 0 ? Math.min((m.actual / m.obj) * 100, 100) : 0;
                                return (
                                    <View key={i} style={[estilos.progresoRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDE }]}>
                                        <Text style={estilos.progresoLabel}>{m.label}</Text>
                                        <View style={estilos.progresoDer}>
                                            <Text style={estilos.progresoValor}>
                                                {m.actual} / {m.obj}
                                            </Text>
                                            <View style={estilos.progresoBarra}>
                                                <View style={[estilos.progresoRelleno, {
                                                    width: `${pct}%`,
                                                    backgroundColor: m.color || AZUL
                                                }]} />
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* ── PLAN DE COMIDAS ── */}
                        <View style={estilos.planHeader}>
                            <Text style={estilos.planTitulo}>PLAN DE COMIDAS</Text>
                            <View style={estilos.planTotalBadge}>
                                <Text style={estilos.planTotalTxt}>Total: {macrosObj.calorias} kcal</Text>
                            </View>
                        </View>

                        {MOMENTOS_ORDEN.map(momento => {
                            const items = comidasPorMomento[momento] || [];
                            const macrosC = macrosDeMomento(items);
                            return (
                                <ComidaCard
                                    key={momento}
                                    momento={momento}
                                    items={items}
                                    macrosComida={macrosC}
                                />
                            );
                        })}

                        <View style={{ height: 140 }} />
                    </>
                )}
            </ScrollView>

            {/* ── FABs ── */}
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

            {/* ═══ MODAL REGISTRO MANUAL ══════════════════════════════════ */}
            <Modal visible={modalManual} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Registrar alimento</Text>

                        {/* Buscador */}
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

                        {/* Resultados */}
                        {resultados.length > 0 && !alimSel && (
                            <ScrollView style={estilos.resultadosScroll} keyboardShouldPersistTaps="handled">
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

                        {/* Alimento seleccionado */}
                        {alimSel && (
                            <View style={estilos.alimSelCard}>
                                <View style={estilos.alimSelRow}>
                                    <Text style={estilos.alimSelNombre}>{alimSel.nombre}</Text>
                                    <TouchableOpacity onPress={() => setAlimSel(null)}>
                                        <Text style={{ color: ROJO, fontSize: 18 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={estilos.alimSelDetalle}>
                                    {alimSel.calorias_100g} kcal · {alimSel.proteinas_100g}g P · {alimSel.carbohidratos_100g}g C · {alimSel.grasas_100g}g G (por 100g)
                                </Text>
                            </View>
                        )}

                        {/* Cantidad + momento */}
                        <View style={estilos.inputsRow}>
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
                        <TouchableOpacity style={estilos.modalBtnGris} onPress={() => { setModalManual(false); setAlimSel(null); setBusqueda(''); }}>
                            <Text style={estilos.modalBtnGrisTxt}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
    contenedor:  { flex: 1, backgroundColor: FONDO },
    cargandoBox: { padding: 60, alignItems: 'center' },

    // Header
    header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 55, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDE },
    headerIzq:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerLogoBox:{ width: 38, height: 38, borderRadius: 11, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    headerLogo:   { fontSize: 20 },
    headerTitulo: { color: TEXTO, fontSize: 17, fontWeight: '700' },
    headerSub:    { color: SUBTXT, fontSize: 11, marginTop: 1 },
    avatarBox:    { width: 36, height: 36, borderRadius: 18, backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center' },
    avatarTxt:    { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Fecha
    fechaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 16, marginVertical: 12, gap: 8 },
    fechaFlechaBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    fechaFlechaTxt: { color: TEXTO, fontSize: 22, fontWeight: '300', lineHeight: 28 },
    fechaBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: BORDE },
    fechaTxt:  { color: TEXTO, fontSize: 15, fontWeight: '600' },
    fechaIcono:{ fontSize: 16 },

    // Estrategia
    estrategiaCard:    { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    estrategiaTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    estrategiaIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AZUL + '30' },
    estrategiaIcono:   { fontSize: 22 },
    estrategiaDia:     { color: AZUL, fontSize: 16, fontWeight: '800', marginBottom: 2 },
    estrategiaTipo:    { color: TEXTO, fontSize: 13, fontWeight: '600' },
    estrategiaBadge:   { backgroundColor: NARANJA + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: NARANJA + '40' },
    estrategiaBadgeTxt:{ color: NARANJA, fontSize: 11, fontWeight: '700' },
    estrategiaDesc:    { color: SUBTXT, fontSize: 13, lineHeight: 20, marginBottom: 12 },
    estadoMetaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    estadoMetaLabel:   { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    estadoMetaBadge:   { backgroundColor: VERDE + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: VERDE + '40' },
    estadoMetaTxt:     { color: VERDE, fontSize: 11, fontWeight: '700' },

    // Macros card
    macrosCard:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    macrosHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    macrosCardTitulo: { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    macrosAjusteRow:  { flexDirection: 'row', gap: 6 },
    macrosAjusteBadge:{ backgroundColor: NARANJA + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: NARANJA + '30' },
    macrosAjusteTxt:  { color: NARANJA, fontSize: 10, fontWeight: '700' },
    macrosGrid:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    macroItem:        { alignItems: 'center', flex: 1 },
    macroEmoji:       { fontSize: 22, marginBottom: 6 },
    macroValor:       { color: TEXTO, fontSize: 22, fontWeight: '800' },
    macroUnidad:      { color: SUBTXT, fontSize: 11, marginTop: -2 },
    macroLabel:       { color: SUBTXT, fontSize: 11, marginTop: 2 },
    cicloRow:         { flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDE },
    cicloLabel:       { color: SUBTXT, fontSize: 13 },
    cicloVal:         { color: ROSA, fontSize: 13, fontWeight: '700' },

    // Progreso
    progresoCard:   { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, paddingVertical: 4, borderWidth: 1, borderColor: BORDE },
    progresoTitulo: { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingVertical: 14 },
    progresoRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    progresoLabel:  { color: SUBTXT, fontSize: 13, flex: 1 },
    progresoDer:    { flex: 1, alignItems: 'flex-end', gap: 6 },
    progresoValor:  { color: TEXTO, fontSize: 13, fontWeight: '700' },
    progresoBarra:  { width: '100%', height: 3, backgroundColor: BORDE, borderRadius: 2, overflow: 'hidden' },
    progresoRelleno:{ height: 3, borderRadius: 2 },

    // Plan comidas
    planHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    planTitulo:      { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    planTotalBadge:  { backgroundColor: CARD2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: BORDE },
    planTotalTxt:    { color: TEXTO, fontSize: 12, fontWeight: '600' },

    comidaCard:      { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    comidaHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    comidaHeaderIzq: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    comidaBorde:     { width: 3, height: 32, borderRadius: 2 },
    comidaNombre:    { color: TEXTO, fontSize: 15, fontWeight: '700' },
    comidaHora:      { color: SUBTXT, fontSize: 12, marginTop: 2 },
    chevron:         { color: SUBTXT, fontSize: 14, fontWeight: '700' },
    comidaBody:      { paddingHorizontal: 14, paddingBottom: 14 },
    comidaVacia:     { color: SUBTXT, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
    ingredienteRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDE },
    ingredienteNombre:{ color: TEXTO, fontSize: 14, fontWeight: '600' },
    ingredienteMarca: { color: SUBTXT, fontSize: 11 },
    pesoCrudo:        { color: NARANJA, fontSize: 10, fontWeight: '700', marginTop: 2 },
    ingredienteCantidad:{ color: AZUL, fontSize: 15, fontWeight: '700' },
    macrosComidaRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
    macroComidaLabel: { color: SUBTXT, fontSize: 11, fontWeight: '700' },
    macroComidaVal:   { color: TEXTO, fontSize: 13, fontWeight: '700', marginRight: 6 },
    macroComidaValNaranja: { color: NARANJA, fontSize: 13, fontWeight: '700', marginRight: 6 },
    macroComidaSep:   { width: 1, height: 12, backgroundColor: BORDE, marginHorizontal: 2 },
    macroComidaKcal:  { color: SUBTXT, fontSize: 12 },
    barrasComida:     { marginTop: 8, gap: 3 },

    // FABs
    fab:        { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    fabAzul:    { bottom: 100, backgroundColor: AZUL, shadowColor: AZUL },
    fabNaranja: { bottom: 164, backgroundColor: NARANJA, shadowColor: NARANJA },
    fabIcono:   { fontSize: 22 },

    // Modales
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    bottomSheet:  { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDE, maxHeight: '85%' },
    sheetHandle:  { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo:  { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 14 },
    buscadorRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    buscadorInput:{ flex: 1, backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 12, fontSize: 14 },
    resultadosScroll: { maxHeight: 200, marginBottom: 10 },
    resultadoItem:    { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDE },
    resultadoNombre:  { color: TEXTO, fontSize: 14, fontWeight: '600' },
    resultadoDetalle: { color: SUBTXT, fontSize: 12, marginTop: 2 },
    alimSelCard:      { backgroundColor: AZUL + '10', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: AZUL + '30' },
    alimSelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    alimSelNombre:    { color: TEXTO, fontSize: 14, fontWeight: '700', flex: 1 },
    alimSelDetalle:   { color: SUBTXT, fontSize: 12 },
    inputsRow:        { flexDirection: 'row', gap: 10, marginBottom: 14 },
    inputLabel:       { color: SUBTXT, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
    inputCampo:       { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, borderRadius: 10, padding: 12, color: TEXTO, fontSize: 14 },
    momentoChip:      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE },
    momentoChipActivo:{ backgroundColor: AZUL, borderColor: AZUL },
    momentoChipTxt:   { color: SUBTXT, fontSize: 12, fontWeight: '600' },
    modalBtn:         { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
    modalBtnTxt:      { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalBtnGris:     { paddingVertical: 14, alignItems: 'center' },
    modalBtnGrisTxt:  { color: SUBTXT, fontSize: 14 },
});