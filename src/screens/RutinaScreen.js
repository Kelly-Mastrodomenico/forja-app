import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Dimensions
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import HeaderForja from '../components/HeaderForja';

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

const MEDIA_BASE   = `${API_URL}/public`;
const DIAS_LABEL   = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LETRA   = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const RIR_OPCIONES = ['Al fallo', 'RIR 0', 'RIR 1', 'RIR 2', 'RIR 3', 'RIR 4'];

// ── Video individual ──────────────────────────────────────────────────────────
function VideoEjercicio({ videoUri, completado }) {
    const player = useVideoPlayer(videoUri || null, p => {
        if (videoUri) { p.loop = true; p.muted = true; p.play(); }
    });
    if (!videoUri) {
        return (
            <View style={[estilos.videoPlaceholder, completado && { opacity: 0.4 }]}>
                <View style={estilos.playBtn}><Text style={estilos.playTxt}>▶</Text></View>
            </View>
        );
    }
    return (
        <VideoView
            player={player}
            style={[estilos.videoEjercicio, completado && { opacity: 0.4 }]}
            contentFit="cover"
            nativeControls={false}
        />
    );
}

// ── Card de ejercicio individual ──────────────────────────────────────────────
function EjercicioCard({
    ejercicio, numero, completado, guardando,
    onToggle, onDolor, onEditar, onEliminar,
    rir, onRirChange,
    pesoLocal, repsLocal, onPesoChange, onRepsChange,
}) {
    const [expandido, setExpandido] = useState(true);
    const [showRir, setShowRir]     = useState(false);
    const videoUri = ejercicio.video_url ? `${MEDIA_BASE}/${ejercicio.video_url}` : null;

    return (
        <View style={[estilos.ejCard, completado && estilos.ejCardCompleto]}>

            {/* Cabecera colapsable */}
            <TouchableOpacity style={estilos.ejHeader} onPress={() => setExpandido(!expandido)} activeOpacity={0.8}>
                <View style={[estilos.ejNumBadge, completado && { backgroundColor: VERDE }]}>
                    <Text style={estilos.ejNumTxt}>{completado ? '✓' : numero}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[estilos.ejNombre, completado && estilos.nombreTachado]} numberOfLines={1}>
                        {ejercicio.nombre}
                    </Text>
                    <View style={estilos.pillsRow}>
                        <View style={estilos.pill}><Text style={estilos.pillTxt}>{ejercicio.series}×{ejercicio.repeticiones}</Text></View>
                        <View style={estilos.pill}><Text style={estilos.pillTxt}>RIR {ejercicio.rir ?? '?'}</Text></View>
                        {ejercicio.peso_kg > 0 && (
                            <View style={estilos.pill}><Text style={estilos.pillTxt}>{ejercicio.peso_kg}kg</Text></View>
                        )}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity onPress={onEditar} style={estilos.accionBtn}>
                        <Text style={{ fontSize: 16 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onEliminar} style={estilos.accionBtn}>
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[estilos.chevron, expandido && { transform: [{ rotate: '180deg' }] }]}>∧</Text>
            </TouchableOpacity>

            {expandido && (<>
                {/* Video */}
                <View style={{ position: 'relative' }}>
                    <VideoEjercicio videoUri={videoUri} completado={completado} />
                    {/* Nombre superpuesto si no hay video */}
                    {!videoUri && ejercicio.nota_tecnica && (
                        <View style={estilos.notaTecnica}>
                            <Text style={estilos.notaTecnicaTxt} numberOfLines={2}>
                                💡 {ejercicio.nota_tecnica}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Controles peso / reps */}
                <View style={estilos.controlesRow}>
                    <View style={estilos.controlItem}>
                        <Text style={estilos.controlLabel}>PESO (kg)</Text>
                        <TextInput
                            style={estilos.controlInput}
                            value={pesoLocal}
                            onChangeText={onPesoChange}
                            keyboardType="decimal-pad"
                            placeholder={String(ejercicio.peso_kg || 0)}
                            placeholderTextColor={SUBTXT}
                        />
                    </View>
                    <View style={estilos.controlItem}>
                        <Text style={estilos.controlLabel}>REPS</Text>
                        <TextInput
                            style={estilos.controlInput}
                            value={repsLocal}
                            onChangeText={onRepsChange}
                            keyboardType="decimal-pad"
                            placeholder={String(ejercicio.repeticiones || '10')}
                            placeholderTextColor={SUBTXT}
                        />
                    </View>
                    <View style={estilos.controlItem}>
                        <Text style={estilos.controlLabel}>RIR PERCIBIDO</Text>
                        <TouchableOpacity style={estilos.rirBtn} onPress={() => setShowRir(true)}>
                            <Text style={estilos.rirBtnTxt}>{rir || 'Seleccionar'}</Text>
                            <Text style={{ color: SUBTXT, fontSize: 10 }}>▼</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Botones completado / dolor */}
                <View style={estilos.botonesRow}>
                    <TouchableOpacity
                        style={[estilos.btnCompletar, completado && estilos.btnCompletarActivo]}
                        onPress={onToggle}
                        disabled={guardando}
                    >
                        {guardando
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Text style={estilos.btnCompletarIcono}>{completado ? '✓' : '◎'}</Text>
                                <Text style={estilos.btnCompletarTxt}>{completado ? 'Completado' : 'Completar'}</Text>
                            </>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.btnDolor} onPress={onDolor}>
                        <Text style={estilos.btnDolorIcono}>⚠</Text>
                        <Text style={estilos.btnDolorTxt}>Dolor</Text>
                    </TouchableOpacity>
                </View>
            </>)}

            {/* Dropdown RIR */}
            <Modal visible={showRir} transparent animationType="fade">
                <TouchableOpacity style={estilos.rirOverlay} activeOpacity={1} onPress={() => setShowRir(false)}>
                    <View style={estilos.rirMenu}>
                        <Text style={estilos.rirMenuTitulo}>RIR Percibido</Text>
                        {RIR_OPCIONES.map(op => (
                            <TouchableOpacity
                                key={op}
                                style={[estilos.rirOpcion, rir === op && estilos.rirOpcionActiva]}
                                onPress={() => { onRirChange(op); setShowRir(false); }}
                            >
                                <Text style={[estilos.rirOpcionTxt, rir === op && { color: AZUL }]}>{op}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RutinaScreen({ navigation }) {
    const [semanas, setSemanas]           = useState([]);
    const [semanaActiva, setSemanaActiva] = useState(1);
    const [diaActivo, setDiaActivo]       = useState(0);
    const [perfil, setPerfil]             = useState(null);
    const [cargando, setCargando]         = useState(false);
    const [generando, setGenerando]       = useState(false);
    const [faseGen, setFaseGen]           = useState(''); // 'rutina' | 'dieta'
    const [completados, setCompletados]   = useState({});
    const [guardandoIdx, setGuardandoIdx] = useState(null);
    const [rirPercibido, setRirPercibido] = useState({});
    const [pesosLocales, setPesosLocales] = useState({});
    const [repsLocales, setRepsLocales]   = useState({});

    // Modal configurar generación
    const [modalConfig, setModalConfig]   = useState(false);
    const [diasSel, setDiasSel]           = useState([0, 1, 2, 4, 5]);
    const [tipoPlan, setTipoPlan]         = useState('semanal');

    // Modal editar ejercicio
    const [modalEditar, setModalEditar]   = useState(false);
    const [ejEditando, setEjEditando]     = useState(null);
    const [ejEditIdx, setEjEditIdx]       = useState(null);
    const [editNombre, setEditNombre]     = useState('');
    const [editSeries, setEditSeries]     = useState('');
    const [editReps, setEditReps]         = useState('');
    const [editDescanso, setEditDescanso] = useState('');

    // Modal añadir ejercicio
    const [modalAnadir, setModalAnadir]   = useState(false);
    const [nuevoNombre, setNuevoNombre]   = useState('');
    const [nuevaSeries, setNuevaSeries]   = useState('3');
    const [nuevaReps, setNuevaReps]       = useState('10-12');
    const [nuevoDescanso, setNuevoDescanso] = useState('90s');

    // Modal dolor
    const [modalDolor, setModalDolor]     = useState(false);
    const [ejDolor, setEjDolor]           = useState(null);
    const [notaDolor, setNotaDolor]       = useState('');

    // Modal fin sesión
    const [modalFin, setModalFin]         = useState(false);

    useFocusEffect(useCallback(() => { cargarDatos(); }, []));

    async function cargarDatos() {
        setCargando(true);
        try {
            const token   = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };
            const [rPerfil, rPlan, guardComp, guardRir] = await Promise.all([
                axios.get(`${API_URL}/usuario/perfil.php`, { headers, timeout: 10000 }),
                axios.get(`${API_URL}/rutina/obtener-rutina.php`, { headers, timeout: 15000 }).catch(() => null),
                AsyncStorage.getItem('forja_completados'),
                AsyncStorage.getItem('forja_rir'),
            ]);
            if (rPerfil.data)           setPerfil(rPerfil.data);
            if (rPlan?.data?.semanas)   { setSemanas(rPlan.data.semanas); setSemanaActiva(1); setDiaActivo(0); }
            if (guardComp)              setCompletados(JSON.parse(guardComp));
            if (guardRir)               setRirPercibido(JSON.parse(guardRir));
        } catch (e) { console.log('Error rutina:', e.message); }
        finally { setCargando(false); }
    }

    async function generarRutina() {
        setModalConfig(false);
        setGenerando(true);
        setFaseGen('rutina');
        const timerDieta = setTimeout(() => setFaseGen('dieta'), 8000);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.post(
                `${API_URL}/ia/generar-rutina.php`,
                { tipo: tipoPlan, dias_semana: diasSel },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 }
            );
            clearTimeout(timerDieta);
            if (resp.data?.plan_id) {
                await AsyncStorage.multiRemove(['forja_completados', 'forja_rir', 'forja_comidas_completadas']);
                setCompletados({});
                setRirPercibido({});
                await cargarDatos();
                const dietaOk = resp.data?.plan_nutricional_guardado;
                Alert.alert(
                    '✅ Todo listo',
                    dietaOk
                        ? `Rutina y plan nutricional generados para ${diasSel.length} días.`
                        : `Rutina generada. Nutrición: ${resp.data?.dieta_error || 'intenta de nuevo.'}`
                );
            } else {
                Alert.alert('Error', resp.data?.error || 'No se pudo generar la rutina.');
            }
        } catch (e) {
            clearTimeout(timerDieta);
            Alert.alert('Error', 'Tiempo de espera agotado. Intenta de nuevo.');
        } finally { setGenerando(false); setFaseGen(''); }
    }

    async function toggleEjercicio(diaIdx, ejIdx) {
        const clave       = `${semanaActiva}_${diaIdx}_${ejIdx}`;
        const nuevoEstado = !completados[clave];
        const nuevos      = { ...completados, [clave]: nuevoEstado };
        setCompletados(nuevos);
        await AsyncStorage.setItem('forja_completados', JSON.stringify(nuevos));

        // Detectar sesión completa
        const ejsDia = diasActuales[diaIdx]?.ejercicios || [];
        const todosDone = ejsDia.every((_, i) => {
            const k = `${semanaActiva}_${diaIdx}_${i}`;
            return k === clave ? nuevoEstado : !!nuevos[k];
        });
        if (todosDone && nuevoEstado) setTimeout(() => setModalFin(true), 600);

        setGuardandoIdx(clave);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const ej    = ejsDia[ejIdx];
            await axios.post(
                `${API_URL}/entreno/completar-ejercicio.php`,
                {
                    plan_detalle_id: ej.detalle_id,
                    ejercicio_id:    ej.ejercicio_id,
                    series:          ej.series,
                    repeticiones:    repsLocales[clave] || ej.repeticiones,
                    peso_kg:         pesosLocales[clave] ?? ej.peso_kg ?? 0,
                    rir_percibido:   rirPercibido[clave] || null,
                    completado:      nuevoEstado ? 1 : 0,
                    fecha:           new Date().toISOString().split('T')[0],
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch {}
        finally { setGuardandoIdx(null); }
    }

    async function reportarDolor() {
        if (!ejDolor) return;
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/entreno/reportar-dolor.php`,
                { ejercicio: ejDolor.nombre, nota: notaDolor, fecha: new Date().toISOString().split('T')[0] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('⚠️ Dolor registrado', 'FORJA lo tendrá en cuenta al ajustar tu próxima rutina.');
        } catch {}
        setModalDolor(false); setEjDolor(null); setNotaDolor('');
    }

    async function cambiarRir(clave, valor) {
        const nuevo = { ...rirPercibido, [clave]: valor };
        setRirPercibido(nuevo);
        await AsyncStorage.setItem('forja_rir', JSON.stringify(nuevo));
    }

    function guardarEdicion() {
        const nuevasSemanas = semanas.map(s => {
            if (s.semana_numero !== semanaActiva) return s;
            return {
                ...s, dias: s.dias.map((d, i) => {
                    if (i !== diaActivo) return d;
                    return {
                        ...d, ejercicios: d.ejercicios.map((ej, j) => {
                            if (j !== ejEditIdx) return ej;
                            return { ...ej, nombre: editNombre, series: parseInt(editSeries) || ej.series, repeticiones: editReps, descanso: editDescanso };
                        })
                    };
                })
            };
        });
        setSemanas(nuevasSemanas);
        setModalEditar(false);
    }

    function eliminarEjercicio(ejIdx) {
        Alert.alert('Eliminar ejercicio', '¿Seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: () => {
                    setSemanas(semanas.map(s => {
                        if (s.semana_numero !== semanaActiva) return s;
                        return {
                            ...s, dias: s.dias.map((d, i) => {
                                if (i !== diaActivo) return d;
                                return { ...d, ejercicios: d.ejercicios.filter((_, j) => j !== ejIdx) };
                            })
                        };
                    }));
                }
            },
        ]);
    }

    function confirmarAnadir() {
        if (!nuevoNombre.trim()) { Alert.alert('Error', 'Escribe el nombre del ejercicio.'); return; }
        const nuevo = {
            detalle_id: null, ejercicio_id: 'manual',
            nombre: nuevoNombre.trim(), video_url: null,
            series: parseInt(nuevaSeries) || 3,
            repeticiones: nuevaReps, descanso: nuevoDescanso,
            rir: null, nota_tecnica: null, peso_kg: 0,
        };
        setSemanas(semanas.map(s => {
            if (s.semana_numero !== semanaActiva) return s;
            return {
                ...s, dias: s.dias.map((d, i) => {
                    if (i !== diaActivo) return d;
                    return { ...d, ejercicios: [...(d.ejercicios || []), nuevo] };
                })
            };
        }));
        setModalAnadir(false);
        setNuevoNombre(''); setNuevaSeries('3'); setNuevaReps('10-12'); setNuevoDescanso('90s');
    }

    function toggleDia(diaIdx) {
        setDiasSel(prev =>
            prev.includes(diaIdx) ? prev.filter(d => d !== diaIdx) : [...prev, diaIdx].sort()
        );
    }

    // ── Datos derivados ──────────────────────────────────────────────────────
    const diasActuales   = semanas.find(s => s.semana_numero === semanaActiva)?.dias || [];
    const diaData        = diasActuales[diaActivo];
    const ejerciciosDia  = diaData?.ejercicios || [];
    const completadosDia = ejerciciosDia.filter((_, i) => completados[`${semanaActiva}_${diaActivo}_${i}`]).length;
    const hayPlan        = semanas.length > 0;
    const objetivoLabel  = { perder_grasa: 'Perder Grasa', ganar_musculo: 'Ganar Músculo', recomposicion: 'Recomposición', mantenimiento: 'Mantenimiento' }[perfil?.objetivo] || perfil?.objetivo || '—';

    return (
        <View style={estilos.contenedor}>

            {/* ── HEADER ── */}
            <HeaderForja derecha={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity style={estilos.headerIconBtn} onPress={() => setModalConfig(true)}>
                        <Text style={{ fontSize: 20 }}>⚙️</Text>
                    </TouchableOpacity>
                    <View style={estilos.avatarBox}>
                        <Text style={estilos.avatarTxt}>{perfil?.nombre?.charAt(0)?.toUpperCase() || 'U'}</Text>
                    </View>
                </View>
            } />

            {/* ── SELECTOR SEMANAS ── */}
            {semanas.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.semanasBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                    {semanas.map(s => (
                        <TouchableOpacity
                            key={s.semana_numero}
                            style={[estilos.semanaTab, semanaActiva === s.semana_numero && estilos.semanaTabActivo]}
                            onPress={() => { setSemanaActiva(s.semana_numero); setDiaActivo(0); }}
                        >
                            <Text style={[estilos.semanaTabTxt, semanaActiva === s.semana_numero && { color: '#fff' }]}>
                                {s.es_deload ? `S${s.semana_numero} 🔽` : `Semana ${s.semana_numero}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* ── TABS DE DÍAS ── */}
            {hayPlan && (
                <View style={estilos.diasBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.diasScroll}>
                        {diasActuales.map((dia, i) => {
                            const ejsDia = dia.ejercicios || [];
                            const hechos = ejsDia.filter((_, j) => completados[`${semanaActiva}_${i}_${j}`]).length;
                            const listo  = ejsDia.length > 0 && hechos === ejsDia.length;
                            const activo = diaActivo === i;
                            const diaReal = dia.dia_semana ?? i;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[estilos.diaTab, activo && estilos.diaTabActivo, listo && estilos.diaTabListo]}
                                    onPress={() => setDiaActivo(i)}
                                >
                                    <Text style={[estilos.diaTabLetra, activo && { color: '#fff' }]}>
                                        {DIAS_LETRA[diaReal] ?? String(i + 1)}
                                    </Text>
                                    <Text style={[estilos.diaTabNombre, activo && { color: '#fff' }]}>
                                        {DIAS_LABEL[diaReal] ?? `D${i + 1}`}
                                    </Text>
                                    {listo && <View style={estilos.diaTabCheck}><Text style={{ color: '#fff', fontSize: 8 }}>✓</Text></View>}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── CARGANDO / GENERANDO ── */}
            {(cargando || generando) && (
                <View style={estilos.cargandoBox}>
                    <ActivityIndicator size="large" color={AZUL} />
                    <Text style={estilos.cargandoTxt}>
                        {generando
                            ? faseGen === 'dieta' ? '🍽️ Generando plan de nutrición...' : '⚡ Generando rutina con IA...'
                            : 'Cargando...'}
                    </Text>
                    {generando && (
                        <>
                            <Text style={estilos.cargandoSub}>
                                {faseGen === 'dieta'
                                    ? 'Calculando macros y comidas para cada día'
                                    : 'Analizando tu perfil biológico · 30-60s'}
                            </Text>
                            <View style={estilos.fasesRow}>
                                <View style={[estilos.fasePill, { backgroundColor: AZUL }]}>
                                    <Text style={estilos.fasePillTxt}>1 Rutina ✓</Text>
                                </View>
                                <View style={estilos.faseLinea} />
                                <View style={[estilos.fasePill, faseGen === 'dieta' ? { backgroundColor: NARANJA } : { backgroundColor: CARD2 }]}>
                                    <Text style={[estilos.fasePillTxt, faseGen !== 'dieta' && { color: SUBTXT }]}>2 Nutrición</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            )}

            {/* ── SIN PLAN ── */}
            {!cargando && !generando && !hayPlan && (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={estilos.generadorCard}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🤖</Text>
                        <Text style={estilos.generadorTitulo}>Generador FORJA IA</Text>
                        <Text style={estilos.generadorDesc}>
                            Objetivo: <Text style={{ color: AZUL }}>{objetivoLabel}</Text>
                            {perfil?.nivel ? `  ·  Nivel ${perfil.nivel}` : ''}
                            {perfil?.dias_entrenamiento ? `  ·  ${perfil.dias_entrenamiento} días/sem` : ''}
                        </Text>
                        <TouchableOpacity style={estilos.btnGenerar} onPress={() => setModalConfig(true)}>
                            <Text style={estilos.btnGenerarTxt}>✨ Generar mi rutina</Text>
                        </TouchableOpacity>
                        <Text style={estilos.generadorHint}>
                            La IA creará un plan de entrenamiento y nutrición basado en tu perfil biológico.
                        </Text>
                    </View>
                </ScrollView>
            )}

            {/* ── CONTENIDO DEL DÍA ── */}
            {!cargando && !generando && hayPlan && (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Info del día */}
                    {diaData && (
                        <View style={estilos.diaInfoCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                <View>
                                    <Text style={estilos.diaInfoTitulo}>{diaData.dia_nombre || `Día ${diaActivo + 1}`}</Text>
                                    {diaData.grupo_muscular && (
                                        <Text style={estilos.diaInfoSub}>Enfoque: {diaData.grupo_muscular}</Text>
                                    )}
                                </View>
                                <View style={[estilos.intensidadBadge, completadosDia === ejerciciosDia.length && ejerciciosDia.length > 0 && { backgroundColor: VERDE + '20', borderColor: VERDE + '40' }]}>
                                    <Text style={[estilos.intensidadTxt, completadosDia === ejerciciosDia.length && ejerciciosDia.length > 0 && { color: VERDE }]}>
                                        {completadosDia === ejerciciosDia.length && ejerciciosDia.length > 0 ? '✅ Completado' : 'Alta Intensidad'}
                                    </Text>
                                </View>
                            </View>
                            <View style={estilos.barraFondo}>
                                <View style={[estilos.barraRelleno, {
                                    width: ejerciciosDia.length > 0 ? `${(completadosDia / ejerciciosDia.length) * 100}%` : '0%'
                                }]} />
                            </View>
                            <Text style={estilos.progresoTxt}>{completadosDia}/{ejerciciosDia.length} ejercicios</Text>
                        </View>
                    )}

                    {/* Mini card regenerar */}
                    <TouchableOpacity style={estilos.regenerarMini} onPress={() => setModalConfig(true)}>
                        <Text style={{ fontSize: 18 }}>🤖</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={estilos.regenerarMiniTitulo}>Regenerar plan FORJA IA</Text>
                            <Text style={estilos.regenerarMiniSub}>Objetivo: {objetivoLabel}</Text>
                        </View>
                        <Text style={estilos.regenerarMiniBtn}>🔄 Nuevo</Text>
                    </TouchableOpacity>

                    {/* Ejercicios */}
                    {ejerciciosDia.map((ej, i) => {
                        const clave = `${semanaActiva}_${diaActivo}_${i}`;
                        return (
                            <EjercicioCard
                                key={i}
                                ejercicio={ej}
                                numero={i + 1}
                                completado={!!completados[clave]}
                                guardando={guardandoIdx === clave}
                                rir={rirPercibido[clave]}
                                pesoLocal={pesosLocales[clave] ?? ''}
                                repsLocal={repsLocales[clave] ?? ''}
                                onToggle={() => toggleEjercicio(diaActivo, i)}
                                onDolor={() => { setEjDolor(ej); setModalDolor(true); }}
                                onEditar={() => {
                                    setEjEditando(ej); setEjEditIdx(i);
                                    setEditNombre(ej.nombre); setEditSeries(String(ej.series));
                                    setEditReps(String(ej.repeticiones || '10-12')); setEditDescanso(ej.descanso || '90s');
                                    setModalEditar(true);
                                }}
                                onEliminar={() => eliminarEjercicio(i)}
                                onRirChange={v => cambiarRir(clave, v)}
                                onPesoChange={v => setPesosLocales(prev => ({ ...prev, [clave]: v }))}
                                onRepsChange={v => setRepsLocales(prev => ({ ...prev, [clave]: v }))}
                            />
                        );
                    })}

                    {/* Añadir ejercicio */}
                    <TouchableOpacity style={estilos.btnAnadir} onPress={() => setModalAnadir(true)}>
                        <Text style={estilos.btnAnadirTxt}>+ Añadir Ejercicio</Text>
                    </TouchableOpacity>

                    {/* Guardar sesión */}
                    <TouchableOpacity style={estilos.btnGuardarSesion} onPress={() => setModalFin(true)}>
                        <Text style={estilos.btnGuardarSesionTxt}>Guardar Sesión</Text>
                    </TouchableOpacity>

                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {/* ══ MODAL CONFIGURAR GENERACIÓN ══════════════════════════════ */}
            <Modal visible={modalConfig} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>⚙️ Configurar Rutina</Text>
                        <Text style={estilos.sheetDesc}>Selecciona los días que entrenas cada semana.</Text>

                        <Text style={estilos.sheetLabel}>DÍAS DE ENTRENAMIENTO</Text>
                        <View style={estilos.diasSelectorRow}>
                            {DIAS_LABEL.map((label, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[estilos.diaSelectorBtn, diasSel.includes(i) && estilos.diaSelectorBtnActivo]}
                                    onPress={() => toggleDia(i)}
                                >
                                    <Text style={[estilos.diaSelectorLetra, diasSel.includes(i) && { color: '#fff' }]}>
                                        {DIAS_LETRA[i]}
                                    </Text>
                                    <Text style={[estilos.diaSelectorNombre, diasSel.includes(i) && { color: '#fff' }]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={{ color: SUBTXT, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
                            {diasSel.length} días seleccionados
                        </Text>

                        <Text style={estilos.sheetLabel}>TIPO DE PLAN</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            {[
                                { key: 'semanal', label: '1 Semana', desc: 'Ciclo básico' },
                                { key: 'mensual', label: '4 Semanas', desc: 'Con progresión' },
                            ].map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[estilos.tipoBtn, tipoPlan === t.key && estilos.tipoBtnActivo]}
                                    onPress={() => setTipoPlan(t.key)}
                                >
                                    <Text style={[estilos.tipoBtnLabel, tipoPlan === t.key && { color: '#fff' }]}>{t.label}</Text>
                                    <Text style={[estilos.tipoBtnDesc, tipoPlan === t.key && { color: '#fff' }]}>{t.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[estilos.btnGenerarModal, diasSel.length === 0 && { opacity: 0.4 }]}
                            onPress={generarRutina}
                            disabled={diasSel.length === 0}
                        >
                            <Text style={estilos.btnGenerarModalTxt}>✨ Generar ahora</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setModalConfig(false)}>
                            <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══ MODAL EDITAR EJERCICIO ════════════════════════════════════ */}
            <Modal visible={modalEditar} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>✏️ Editar Ejercicio</Text>
                        <Text style={estilos.sheetLabel}>Nombre</Text>
                        <TextInput style={estilos.sheetInput} value={editNombre} onChangeText={setEditNombre} placeholderTextColor={SUBTXT} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Series</Text>
                                <TextInput style={estilos.sheetInput} value={editSeries} onChangeText={setEditSeries} keyboardType="number-pad" placeholderTextColor={SUBTXT} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Reps</Text>
                                <TextInput style={estilos.sheetInput} value={editReps} onChangeText={setEditReps} keyboardType="decimal-pad" placeholderTextColor={SUBTXT} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Descanso</Text>
                                <TextInput style={estilos.sheetInput} value={editDescanso} onChangeText={setEditDescanso} placeholderTextColor={SUBTXT} />
                            </View>
                        </View>
                        <TouchableOpacity style={estilos.btnGenerarModal} onPress={guardarEdicion}>
                            <Text style={estilos.btnGenerarModalTxt}>Guardar cambios</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setModalEditar(false)}>
                            <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══ MODAL AÑADIR EJERCICIO ════════════════════════════════════ */}
            <Modal visible={modalAnadir} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>+ Añadir Ejercicio</Text>
                        <Text style={estilos.sheetLabel}>Nombre del ejercicio</Text>
                        <TextInput
                            style={estilos.sheetInput}
                            value={nuevoNombre}
                            onChangeText={setNuevoNombre}
                            placeholder="Ej: Press banca, Sentadilla..."
                            placeholderTextColor={SUBTXT}
                            autoFocus
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Series</Text>
                                <TextInput style={estilos.sheetInput} value={nuevaSeries} onChangeText={setNuevaSeries} keyboardType="number-pad" placeholderTextColor={SUBTXT} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Reps</Text>
                                <TextInput style={estilos.sheetInput} value={nuevaReps} onChangeText={setNuevaReps} keyboardType="decimal-pad" placeholderTextColor={SUBTXT} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.sheetLabel}>Descanso</Text>
                                <TextInput style={estilos.sheetInput} value={nuevoDescanso} onChangeText={setNuevoDescanso} placeholder="90s" placeholderTextColor={SUBTXT} />
                            </View>
                        </View>
                        <TouchableOpacity style={estilos.btnGenerarModal} onPress={confirmarAnadir}>
                            <Text style={estilos.btnGenerarModalTxt}>Añadir ejercicio</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setModalAnadir(false)}>
                            <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══ MODAL REPORTAR DOLOR ═════════════════════════════════════ */}
            <Modal visible={modalDolor} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>⚠️ Reportar Dolor</Text>
                        <Text style={estilos.sheetDesc}>
                            {ejDolor?.nombre} — Describe la molestia para que FORJA ajuste tu rutina.
                        </Text>
                        <TextInput
                            style={[estilos.sheetInput, { height: 80, textAlignVertical: 'top' }]}
                            value={notaDolor}
                            onChangeText={setNotaDolor}
                            placeholder="Ej: Dolor en rodilla izquierda al bajar..."
                            placeholderTextColor={SUBTXT}
                            multiline
                        />
                        <TouchableOpacity style={[estilos.btnGenerarModal, { backgroundColor: ROJO }]} onPress={reportarDolor}>
                            <Text style={estilos.btnGenerarModalTxt}>Reportar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => setModalDolor(false)}>
                            <Text style={{ color: SUBTXT, fontSize: 14 }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ══ MODAL FIN DE SESIÓN ══════════════════════════════════════ */}
            <Modal visible={modalFin} transparent animationType="fade">
                <View style={estilos.modalOverlay}>
                    <View style={[estilos.bottomSheet, { alignItems: 'center', paddingVertical: 40 }]}>
                        <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
                        <Text style={[estilos.sheetTitulo, { textAlign: 'center' }]}>¡Sesión Completada!</Text>
                        <Text style={[estilos.sheetDesc, { textAlign: 'center', marginBottom: 24 }]}>
                            Has completado todos los ejercicios del día. FORJA actualizará tu fatiga muscular.
                        </Text>
                        <TouchableOpacity style={estilos.btnGenerarModal} onPress={() => setModalFin(false)}>
                            <Text style={estilos.btnGenerarModalTxt}>¡Perfecto! 💪</Text>
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
    cargandoBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    cargandoTxt: { color: TEXTO, fontSize: 16, fontWeight: '700' },
    cargandoSub: { color: SUBTXT, fontSize: 13 },
    fasesRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    fasePill:    { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    fasePillTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    faseLinea:   { width: 24, height: 2, backgroundColor: BORDE },

    headerIconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    avatarBox:     { width: 38, height: 38, borderRadius: 19, backgroundColor: AZUL + '30', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AZUL + '60' },
    avatarTxt:     { color: AZUL, fontSize: 16, fontWeight: '800' },

    semanasBar:    { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: BORDE },
    semanaTab:     { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    semanaTabActivo:{ borderBottomColor: AZUL },
    semanaTabTxt:  { color: SUBTXT, fontSize: 13, fontWeight: '600' },

    diasBar:    { borderBottomWidth: 1, borderBottomColor: BORDE },
    diasScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    diaTab:     { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDE, minWidth: 48, position: 'relative' },
    diaTabActivo:{ backgroundColor: AZUL, borderColor: AZUL },
    diaTabListo: { borderColor: VERDE },
    diaTabLetra: { color: SUBTXT, fontSize: 13, fontWeight: '800' },
    diaTabNombre:{ color: SUBTXT, fontSize: 10 },
    diaTabCheck: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: VERDE, justifyContent: 'center', alignItems: 'center' },

    // Sin plan
    generadorCard:  { backgroundColor: CARD, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    generadorTitulo:{ color: TEXTO, fontSize: 20, fontWeight: '800', marginBottom: 8 },
    generadorDesc:  { color: SUBTXT, fontSize: 14, textAlign: 'center', marginBottom: 20 },
    generadorHint:  { color: SUBTXT, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18 },
    btnGenerar:     { backgroundColor: AZUL, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    btnGenerarTxt:  { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Info día
    diaInfoCard:    { margin: 16, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDE },
    diaInfoTitulo:  { color: TEXTO, fontSize: 16, fontWeight: '800' },
    diaInfoSub:     { color: SUBTXT, fontSize: 12, marginTop: 2 },
    intensidadBadge:{ backgroundColor: NARANJA + '15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: NARANJA + '30' },
    intensidadTxt:  { color: NARANJA, fontSize: 11, fontWeight: '700' },
    barraFondo:     { height: 6, backgroundColor: BORDE, borderRadius: 3, overflow: 'hidden', marginVertical: 10 },
    barraRelleno:   { height: 6, backgroundColor: AZUL, borderRadius: 3 },
    progresoTxt:    { color: SUBTXT, fontSize: 11 },

    // Regenerar mini
    regenerarMini:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDE },
    regenerarMiniTitulo:{ color: TEXTO, fontSize: 13, fontWeight: '700' },
    regenerarMiniSub:  { color: SUBTXT, fontSize: 11, marginTop: 2 },
    regenerarMiniBtn:  { color: AZUL, fontSize: 12, fontWeight: '700' },

    // Card ejercicio
    ejCard:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    ejCardCompleto: { borderColor: VERDE + '40', opacity: 0.8 },
    ejHeader:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    ejNumBadge:     { width: 28, height: 28, borderRadius: 14, backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center' },
    ejNumTxt:       { color: '#fff', fontSize: 12, fontWeight: '800' },
    ejNombre:       { color: TEXTO, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    nombreTachado:  { textDecorationLine: 'line-through', color: SUBTXT },
    pillsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill:           { backgroundColor: CARD2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    pillTxt:        { color: AZUL, fontSize: 11, fontWeight: '700' },
    accionBtn:      { padding: 4 },
    chevron:        { color: SUBTXT, fontSize: 14, marginLeft: 4 },

    videoEjercicio:   { width: '100%', height: 180 },
    videoPlaceholder: { width: '100%', height: 180, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center' },
    playBtn:          { width: 48, height: 48, borderRadius: 24, backgroundColor: AZUL + '30', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AZUL + '60' },
    playTxt:          { color: AZUL, fontSize: 18 },

    notaTecnica:    { padding: 10, backgroundColor: CARD2 },
    notaTecnicaTxt: { color: SUBTXT, fontSize: 12, lineHeight: 18 },

    controlesRow:   { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 0 },
    controlItem:    { flex: 1 },
    controlLabel:   { color: SUBTXT, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    controlInput:   { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 10, fontSize: 14, textAlign: 'center' },
    rirBtn:         { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rirBtnTxt:      { color: TEXTO, fontSize: 11 },

    botonesRow:        { flexDirection: 'row', gap: 10, padding: 14 },
    btnCompletar:      { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: CARD2, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: BORDE },
    btnCompletarActivo:{ backgroundColor: VERDE, borderColor: VERDE },
    btnCompletarIcono: { color: '#fff', fontSize: 16 },
    btnCompletarTxt:   { color: '#fff', fontSize: 14, fontWeight: '700' },
    btnDolor:          { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: ROJO + '15', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: ROJO + '30' },
    btnDolorIcono:     { color: ROJO, fontSize: 14 },
    btnDolorTxt:       { color: ROJO, fontSize: 13, fontWeight: '700' },

    rirOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    rirMenu:         { backgroundColor: CARD, borderRadius: 16, padding: 16, width: 200, borderWidth: 1, borderColor: BORDE },
    rirMenuTitulo:   { color: TEXTO, fontSize: 14, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    rirOpcion:       { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDE },
    rirOpcionActiva: { backgroundColor: AZUL + '15' },
    rirOpcionTxt:    { color: SUBTXT, fontSize: 14, textAlign: 'center' },

    btnAnadir:        { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: AZUL + '40', borderStyle: 'dashed' },
    btnAnadirTxt:     { color: AZUL, fontSize: 14, fontWeight: '700' },
    btnGuardarSesion: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: AZUL, shadowColor: AZUL, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
    btnGuardarSesionTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Modales
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    bottomSheet:    { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDE },
    sheetHandle:    { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo:    { color: TEXTO, fontSize: 20, fontWeight: '800', marginBottom: 6 },
    sheetDesc:      { color: SUBTXT, fontSize: 13, marginBottom: 16 },
    sheetLabel:     { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
    sheetInput:     { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 12, fontSize: 14, marginBottom: 4 },

    diasSelectorRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    diaSelectorBtn:   { alignItems: 'center', padding: 8, borderRadius: 12, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, minWidth: 42 },
    diaSelectorBtnActivo: { backgroundColor: AZUL, borderColor: AZUL },
    diaSelectorLetra: { color: SUBTXT, fontSize: 13, fontWeight: '800' },
    diaSelectorNombre:{ color: SUBTXT, fontSize: 9, marginTop: 2 },

    tipoBtn:      { flex: 1, backgroundColor: CARD2, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    tipoBtnActivo:{ backgroundColor: AZUL, borderColor: AZUL },
    tipoBtnLabel: { color: SUBTXT, fontSize: 14, fontWeight: '700' },
    tipoBtnDesc:  { color: SUBTXT, fontSize: 11, marginTop: 4 },

    btnGenerarModal:    { backgroundColor: AZUL, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnGenerarModalTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});