import { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Animated
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import HeaderForja from '../components/HeaderForja';

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

const MEDIA_BASE  = `${API_URL}/public`;
const DIAS_LABEL  = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LETRA  = ['L',   'M',   'X',   'J',   'V',   'S',   'D'  ];
const RIR_OPCIONES = ['Al fallo', 'RIR 0', 'RIR 1', 'RIR 2', 'RIR 3', 'RIR 4'];

// ─── Componente de video individual ──────────────────────────────────────────
function VideoEjercicio({ videoUri, completado }) {
    const player = useVideoPlayer(videoUri || null, p => {
        if (videoUri) { p.loop = true; p.muted = true; p.play(); }
    });
    if (!videoUri) return (
        <View style={[estilos.videoPlaceholder, completado && { opacity: 0.4 }]}>
            <View style={estilos.playBtn}><Text style={estilos.playTxt}>▶</Text></View>
        </View>
    );
    return (
        <VideoView
            player={player}
            style={[estilos.videoEjercicio, completado && { opacity: 0.4 }]}
            contentFit="cover"
            nativeControls={false}
        />
    );
}

// ─── Card de ejercicio ────────────────────────────────────────────────────────
function EjercicioCard({
    ejercicio, numero, completado, guardando,
    onToggleCompletado, onDolor, onEditar, onEliminar,
    rir, onRirChange, onCambiarPeso, onCambiarReps, onSustituir
}) {
    const [expandido, setExpandido]   = useState(true);
    const [showRir, setShowRir]       = useState(false);
    const [pesoLocal, setPesoLocal]   = useState(String(ejercicio.peso_kg || 0));
    const [repsLocal, setRepsLocal]   = useState(String(ejercicio.repeticiones || '10-12'));
    const videoUri = ejercicio.video_url ? `${MEDIA_BASE}/${ejercicio.video_url}` : null;

    return (
        <View style={[estilos.ejCard, completado && estilos.ejCardCompleto]}>

            {/* Número + header colapsable */}
            <TouchableOpacity style={estilos.ejHeader} onPress={() => setExpandido(!expandido)} activeOpacity={0.8}>
                <View style={estilos.ejNumBadge}>
                    <Text style={estilos.ejNumTxt}>{numero}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[estilos.ejNombre, completado && estilos.nombreTachado]} numberOfLines={1}>
                        {ejercicio.nombre}
                    </Text>
                    <View style={estilos.ejPillsRow}>
                        <View style={estilos.pill}><Text style={estilos.pillTxt}>{ejercicio.series}×{ejercicio.repeticiones}</Text></View>
                        <View style={estilos.pill}><Text style={estilos.pillTxt}>RIR {ejercicio.rir ?? '?'}</Text></View>
                        {ejercicio.descanso && <View style={estilos.pill}><Text style={estilos.pillTxt}>{ejercicio.descanso}</Text></View>}
                    </View>
                </View>
                <View style={estilos.ejAcciones}>
                    <TouchableOpacity onPress={onEditar} style={estilos.accionBtn}>
                        <Text style={estilos.accionIcono}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onEliminar} style={estilos.accionBtn}>
                        <Text style={estilos.accionIcono}>🗑️</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[estilos.chevron, !expandido && { transform: [{ rotate: '180deg' }] }]}>∧</Text>
            </TouchableOpacity>

            {expandido && (
                <>
                    {/* Video */}
                    <View style={estilos.videoContenedor}>
                        {/* Checkbox */}
                        <TouchableOpacity
                            style={[estilos.checkbox, completado && estilos.checkboxActivo]}
                            onPress={onToggleCompletado}
                            disabled={guardando}
                        >
                            {guardando
                                ? <ActivityIndicator size="small" color="#fff" />
                                : completado ? <Text style={estilos.checkTxt}>✓</Text> : null
                            }
                        </TouchableOpacity>
                        <VideoEjercicio videoUri={videoUri} completado={completado} />
                    </View>

                    {/* Nota técnica */}
                    {ejercicio.nota_tecnica && (
                        <View style={estilos.notaRow}>
                            <Text style={estilos.notaIcono}>ⓘ</Text>
                            <Text style={estilos.notaTxt}>{ejercicio.nota_tecnica}</Text>
                        </View>
                    )}

                    {/* Pausa especial */}
                    {ejercicio.pausa_especial && (
                        <Text style={estilos.pausaTxt}>⏱ {ejercicio.pausa_especial}</Text>
                    )}

                    {/* Sustitución */}
                    {ejercicio.sustitucion_nombre && (
                        <TouchableOpacity style={estilos.sustitucionRow} onPress={onSustituir}>
                            <Text style={estilos.sustitucionIcono}>🔄</Text>
                            <Text style={estilos.sustitucionTxt}>
                                Sustitución: <Text style={estilos.sustitucionNombre}>{ejercicio.sustitucion_nombre}</Text>
                                {ejercicio.sustitucion_riesgo ? ` (${ejercicio.sustitucion_riesgo})` : ''}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Grid inputs — Peso / Reps / RIR */}
                    <View style={estilos.inputsGrid}>
                        {/* Peso */}
                        <View style={estilos.inputGrupo}>
                            <Text style={estilos.inputLabel}>Peso (kg)</Text>
                            <View style={estilos.inputSpinner}>
                                <TouchableOpacity
                                    style={estilos.spinnerBtn}
                                    onPress={() => {
                                        const v = Math.max(0, parseFloat(pesoLocal) - 2.5);
                                        setPesoLocal(String(v));
                                        onCambiarPeso(v);
                                    }}
                                >
                                    <Text style={estilos.spinnerTxt}>∨</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={estilos.spinnerInput}
                                    value={pesoLocal}
                                    onChangeText={v => { setPesoLocal(v); onCambiarPeso(parseFloat(v) || 0); }}
                                    keyboardType="decimal-pad"
                                />
                                <TouchableOpacity
                                    style={estilos.spinnerBtn}
                                    onPress={() => {
                                        const v = parseFloat(pesoLocal) + 2.5;
                                        setPesoLocal(String(v));
                                        onCambiarPeso(v);
                                    }}
                                >
                                    <Text style={estilos.spinnerTxt}>∧</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Reps */}
                        <View style={estilos.inputGrupo}>
                            <Text style={estilos.inputLabel}>Reps</Text>
                            <View style={estilos.inputSpinner}>
                                <TouchableOpacity style={estilos.spinnerBtn} onPress={() => {
                                    const v = Math.max(1, parseInt(repsLocal) - 1);
                                    setRepsLocal(String(v)); onCambiarReps(v);
                                }}><Text style={estilos.spinnerTxt}>∨</Text></TouchableOpacity>
                                <TextInput
                                    style={estilos.spinnerInput}
                                    value={repsLocal}
                                    onChangeText={v => { setRepsLocal(v); onCambiarReps(v); }}
                                    keyboardType="default"
                                />
                                <TouchableOpacity style={estilos.spinnerBtn} onPress={() => {
                                    const v = parseInt(repsLocal) + 1;
                                    setRepsLocal(String(v)); onCambiarReps(v);
                                }}><Text style={estilos.spinnerTxt}>∧</Text></TouchableOpacity>
                            </View>
                        </View>

                        {/* RIR */}
                        <View style={estilos.inputGrupo}>
                            <Text style={estilos.inputLabel}>RIR</Text>
                            <TouchableOpacity style={estilos.inputSpinner} onPress={() => setShowRir(true)}>
                                <Text style={[estilos.spinnerInput, { textAlign: 'center', color: NARANJA, fontWeight: '700' }]}>
                                    {rir ?? (ejercicio.rir ?? '?')}
                                </Text>
                                <Text style={estilos.spinnerTxt}>∨</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Botones Completado / Dolor */}
                    <View style={estilos.botonesRow}>
                        <TouchableOpacity
                            style={[estilos.btnCompletado, completado && estilos.btnCompletadoActivo]}
                            onPress={onToggleCompletado}
                            disabled={guardando}
                        >
                            <Text style={estilos.btnCompletadoIcono}>{completado ? '✓' : '◎'}</Text>
                            <Text style={estilos.btnCompletadoTxt}>{completado ? 'Completado' : 'Completar'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={estilos.btnDolor} onPress={onDolor}>
                            <Text style={estilos.btnDolorIcono}>⚠</Text>
                            <Text style={estilos.btnDolorTxt}>Dolor</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Modal RIR */}
            <Modal visible={showRir} transparent animationType="fade">
                <TouchableOpacity style={estilos.rirOverlay} activeOpacity={1} onPress={() => setShowRir(false)}>
                    <View style={estilos.rirMenu}>
                        <Text style={estilos.rirMenuTitulo}>RIR Percibido</Text>
                        {RIR_OPCIONES.map(op => (
                            <TouchableOpacity
                                key={op}
                                style={[estilos.rirOpcion, String(rir) === String(op) && estilos.rirOpcionActiva]}
                                onPress={() => { onRirChange(op); setShowRir(false); }}
                            >
                                <Text style={[estilos.rirOpcionTxt, String(rir) === String(op) && { color: AZUL }]}>{op}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function RutinaScreen({ navigation }) {
    const [semanas, setSemanas]             = useState([]);
    const [semanaActiva, setSemanaActiva]   = useState(1);
    const [diaActivo, setDiaActivo]         = useState(0);
    const [perfil, setPerfil]               = useState(null);
    const [cargando, setCargando]           = useState(false);
    const [generando, setGenerando]         = useState(false);
    const [completados, setCompletados]     = useState({});
    const [guardandoIdx, setGuardandoIdx]   = useState(null);
    const [rirPercibido, setRirPercibido]   = useState({});
    const [pesosLocales, setPesosLocales]   = useState({});
    const [repsLocales, setRepsLocales]     = useState({});

    // Selector de días al generar
    const [modalDias, setModalDias]         = useState(false);
    const [diasSeleccionados, setDiasSeleccionados] = useState([0,1,2,4,5]); // Lun-Mar-Mie-Vie-Sáb por defecto
    const [tipoPlan, setTipoPlan]           = useState('semanal');

    // Modal editar ejercicio
    const [modalEditar, setModalEditar]     = useState(false);
    const [ejEditando, setEjEditando]       = useState(null);
    const [ejEditIdx, setEjEditIdx]         = useState(null);
    const [editNombre, setEditNombre]       = useState('');
    const [editSeries, setEditSeries]       = useState('');
    const [editReps, setEditReps]           = useState('');
    const [editDescanso, setEditDescanso]   = useState('');

    // Modal añadir ejercicio
    const [modalAnadir, setModalAnadir]     = useState(false);
    const [nuevoNombre, setNuevoNombre]     = useState('');
    const [nuevaSeries, setNuevaSeries]     = useState('3');
    const [nuevaReps, setNuevaReps]         = useState('10-12');
    const [nuevoDescanso, setNuevoDescanso] = useState('90s');

    // Modal dolor
    const [modalDolor, setModalDolor]       = useState(false);
    const [ejDolor, setEjDolor]             = useState(null);
    const [notaDolor, setNotaDolor]         = useState('');

    // Modal fin sesión
    const [modalFin, setModalFin]           = useState(false);

    useFocusEffect(useCallback(() => {
        cargarDatos();
    }, []));

    async function cargarDatos() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [rPerfil, rPlan, completadosGuardados, rirGuardado] = await Promise.all([
                axios.get(`${API_URL}/usuario/perfil.php`, { headers, timeout: 10000 }),
                axios.get(`${API_URL}/rutina/obtener-rutina.php`, { headers, timeout: 15000 }).catch(() => null),
                AsyncStorage.getItem('forja_completados'),
                AsyncStorage.getItem('forja_rir'),
            ]);

            if (rPerfil.data) setPerfil(rPerfil.data);
            if (rPlan?.data?.semanas) {
                setSemanas(rPlan.data.semanas);
                setSemanaActiva(1);
                setDiaActivo(0);
            }
            if (completadosGuardados) setCompletados(JSON.parse(completadosGuardados));
            if (rirGuardado)          setRirPercibido(JSON.parse(rirGuardado));
        } catch (e) {
            console.log('Error cargando rutina:', e.message);
        } finally {
            setCargando(false);
        }
    }

    async function generarRutina() {
        setModalDias(false);
        setGenerando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp = await axios.post(
                `${API_URL}/ia/generar-rutina.php`,
                {
                    tipo:              tipoPlan,
                    dias_semana:       diasSeleccionados, // [0=Lun,...,6=Dom]
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 90000 }
            );
            if (resp.data?.plan_id) {
                await AsyncStorage.removeItem('forja_completados');
                await AsyncStorage.removeItem('forja_rir');
                setCompletados({});
                setRirPercibido({});
                await cargarDatos();
                Alert.alert('✅ Rutina generada', `Plan de ${diasSeleccionados.length} días/semana listo.`);
            } else {
                Alert.alert('Error', resp.data?.error || 'No se pudo generar la rutina.');
            }
        } catch (e) {
            Alert.alert('Error', 'Tiempo de espera agotado. Intenta de nuevo.');
        } finally {
            setGenerando(false);
        }
    }

    async function toggleEjercicio(diaIndex, ejIndex) {
        const clave       = `${semanaActiva}_${diaIndex}_${ejIndex}`;
        const nuevoEstado = !completados[clave];
        const nuevos      = { ...completados, [clave]: nuevoEstado };
        setCompletados(nuevos);
        await AsyncStorage.setItem('forja_completados', JSON.stringify(nuevos));

        // Verificar si completó todos
        const ejerciciosDia = diasActuales[diaIndex]?.ejercicios || [];
        const todosDone = ejerciciosDia.every((_, i) => {
            const k = `${semanaActiva}_${diaIndex}_${i}`;
            return k === clave ? nuevoEstado : !!nuevos[k];
        });
        if (todosDone && nuevoEstado) setTimeout(() => setModalFin(true), 600);

        setGuardandoIdx(clave);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const ej    = ejerciciosDia[ejIndex];
            await axios.post(
                `${API_URL}/entreno/completar-ejercicio.php`,
                {
                    plan_detalle_id:  ej.detalle_id,
                    ejercicio_id:     ej.ejercicio_id,
                    series:           ej.series,
                    repeticiones:     repsLocales[clave] || ej.repeticiones,
                    peso_kg:          pesosLocales[clave] ?? ej.peso_kg ?? 0,
                    rir_percibido:    rirPercibido[clave] || null,
                    completado:       nuevoEstado ? 1 : 0,
                    fecha:            new Date().toISOString().split('T')[0],
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch {}
        finally { setGuardandoIdx(null); }
    }

    async function reportarDolor(nombreEj, nota) {
        try {
            const token = await AsyncStorage.getItem('forja_token');
            await axios.post(
                `${API_URL}/entreno/reportar-dolor.php`,
                { ejercicio: nombreEj, nota, fecha: new Date().toISOString().split('T')[0] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('⚠️ Dolor registrado', 'FORJA tomará esto en cuenta al ajustar tu próxima rutina.');
        } catch {}
    }

    async function cambiarRir(clave, valor) {
        const nuevo = { ...rirPercibido, [clave]: valor };
        setRirPercibido(nuevo);
        await AsyncStorage.setItem('forja_rir', JSON.stringify(nuevo));
    }

    function cambiarPeso(clave, valor) {
        setPesosLocales(prev => ({ ...prev, [clave]: valor }));
    }

    function cambiarReps(clave, valor) {
        setRepsLocales(prev => ({ ...prev, [clave]: valor }));
    }

    function abrirEditar(ej, ejIdx) {
        setEjEditando(ej);
        setEjEditIdx(ejIdx);
        setEditNombre(ej.nombre);
        setEditSeries(String(ej.series));
        setEditReps(String(ej.repeticiones || '10-12'));
        setEditDescanso(ej.descanso || '90s');
        setModalEditar(true);
    }

    function guardarEdicion() {
        if (!ejEditIdx !== null) return;
        const nuevasSemanas = semanas.map(s => {
            if (s.semana_numero !== semanaActiva) return s;
            return { ...s, dias: s.dias.map((d, i) => {
                if (i !== diaActivo) return d;
                return { ...d, ejercicios: d.ejercicios.map((ej, j) => {
                    if (j !== ejEditIdx) return ej;
                    return { ...ej, nombre: editNombre, series: parseInt(editSeries) || ej.series, repeticiones: editReps, descanso: editDescanso };
                })};
            })};
        });
        setSemanas(nuevasSemanas);
        setModalEditar(false);
    }

    function eliminarEjercicio(ejIdx) {
        Alert.alert('Eliminar ejercicio', '¿Seguro que quieres eliminar este ejercicio?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => {
                const nuevasSemanas = semanas.map(s => {
                    if (s.semana_numero !== semanaActiva) return s;
                    return { ...s, dias: s.dias.map((d, i) => {
                        if (i !== diaActivo) return d;
                        return { ...d, ejercicios: d.ejercicios.filter((_, j) => j !== ejIdx) };
                    })};
                });
                setSemanas(nuevasSemanas);
            }}
        ]);
    }

    function confirmarAnadir() {
        if (!nuevoNombre.trim()) { Alert.alert('Error', 'Escribe el nombre del ejercicio.'); return; }
        const nuevo = {
            detalle_id: null, ejercicio_id: 'manual',
            nombre: nuevoNombre.trim(), video_url: null, poster_url: null,
            series: parseInt(nuevaSeries) || 3, repeticiones: nuevaReps,
            descanso: nuevoDescanso, rir: null, nota_tecnica: null, sustitucion_nombre: null,
        };
        const nuevasSemanas = semanas.map(s => {
            if (s.semana_numero !== semanaActiva) return s;
            return { ...s, dias: s.dias.map((d, i) => {
                if (i !== diaActivo) return d;
                return { ...d, ejercicios: [...(d.ejercicios || []), nuevo] };
            })};
        });
        setSemanas(nuevasSemanas);
        setModalAnadir(false);
        setNuevoNombre(''); setNuevaSeries('3'); setNuevaReps('10-12'); setNuevoDescanso('90s');
    }

    const diasActuales   = semanas.find(s => s.semana_numero === semanaActiva)?.dias || [];
    const diaData        = diasActuales[diaActivo];
    const ejerciciosDia  = diaData?.ejercicios || [];
    const completadosDia = ejerciciosDia.filter((_, i) => completados[`${semanaActiva}_${diaActivo}_${i}`]).length;
    const hayPlan        = semanas.length > 0;

    // Info del perfil para mostrar en el generador
    const objetivoLabel = {
        perder_grasa: 'Perder Grasa', ganar_musculo: 'Ganar Músculo',
        recomposicion: 'Recomposición', mantenimiento: 'Mantenimiento',
    }[perfil?.objetivo] || perfil?.objetivo || '—';

    return (
        <View style={estilos.contenedor}>

            {/* ── HEADER ── */}
            <HeaderForja derecha={
                <View style={estilos.headerDer}>
                    <TouchableOpacity style={estilos.headerIconBtn} onPress={() => setModalDias(true)}>
                        <Text style={estilos.headerIconTxt}>⚙️</Text>
                    </TouchableOpacity>
                    <View style={estilos.avatarBox}>
                        <Text style={estilos.avatarTxt}>{perfil?.nombre?.charAt(0) || 'U'}</Text>
                    </View>
                </View>
            } />

            {/* ── SELECTOR SEMANAS (plan mensual) ── */}
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

            {/* ── TABS DÍAS ── */}
            {hayPlan && (
                <View style={estilos.diasContenedor}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.diasScroll}>
                        {diasActuales.map((dia, i) => {
                            const ejsDia = dia.ejercicios || [];
                            const hechos = ejsDia.filter((_, j) => completados[`${semanaActiva}_${i}_${j}`]).length;
                            const listo  = ejsDia.length > 0 && hechos === ejsDia.length;
                            const activo = diaActivo === i;
                            // Día real de la semana desde dias_semana del plan
                            const diaReal = dia.dia_semana ?? i; // 0=Lun
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[estilos.diaTab, activo && estilos.diaTabActivo]}
                                    onPress={() => setDiaActivo(i)}
                                >
                                    <Text style={[estilos.diaTabLetra, activo && estilos.diaTabLetraActiva]}>
                                        {DIAS_LETRA[diaReal] ?? DIAS_LETRA[i] ?? (i + 1)}
                                    </Text>
                                    <Text style={[estilos.diaTabNombre, activo && estilos.diaTabNombreActivo]}>
                                        {DIAS_LABEL[diaReal] ?? DIAS_LABEL[i] ?? `D${i+1}`}
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
                        {generando ? 'Generando rutina con IA...' : 'Cargando...'}
                    </Text>
                    {generando && <Text style={estilos.cargandoSub}>Analizando tu perfil biológico · puede tardar 30-60s</Text>}
                </View>
            )}

            {/* ── SIN RUTINA ── */}
            {!cargando && !generando && !hayPlan && (
                <View style={estilos.vacio}>
                    {/* Card generador estilo mockup */}
                    <View style={estilos.generadorCard}>
                        <View style={estilos.generadorIconBox}>
                            <Text style={estilos.generadorIcono}>🤖</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.generadorTitulo}>Generador de Rutina FORJA</Text>
                            <Text style={estilos.generadorSub}>
                                Objetivo: <Text style={{ color: AZUL }}>{objetivoLabel}</Text>
                                {perfil?.nivel ? ` · Nivel: ${perfil.nivel}` : ''}
                                {perfil?.dias_entrenamiento ? ` · ${perfil.dias_entrenamiento} días/sem` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity style={estilos.btnRegenerar} onPress={() => setModalDias(true)}>
                            <Text style={estilos.btnRegenerarIcono}>✨</Text>
                            <Text style={estilos.btnRegenerarTxt}>Generar</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={estilos.vacioDesc}>La IA generará un plan basado en tu perfil biológico y los días que elijas.</Text>
                </View>
            )}

            {/* ── CONTENIDO DEL DÍA ── */}
            {!cargando && !generando && hayPlan && (
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Info día + barra progreso */}
                    {diaData && (
                        <View style={estilos.diaInfo}>
                            <View style={estilos.diaInfoTop}>
                                <View>
                                    <Text style={estilos.diaInfoTitulo}>{diaData.dia_nombre || `Día ${diaActivo + 1}`}</Text>
                                    {diaData.grupo_muscular && (
                                        <Text style={estilos.diaInfoSub}>Enfoque: {diaData.grupo_muscular}</Text>
                                    )}
                                </View>
                                <View style={estilos.intensidadBadge}>
                                    <Text style={estilos.intensidadTxt}>
                                        {completadosDia === ejerciciosDia.length && ejerciciosDia.length > 0
                                            ? '✅ Completado' : 'Alta Intensidad'}
                                    </Text>
                                </View>
                            </View>
                            <View style={estilos.progresoFondo}>
                                <View style={[estilos.progresoRelleno, {
                                    width: ejerciciosDia.length > 0
                                        ? `${(completadosDia / ejerciciosDia.length) * 100}%` : '0%'
                                }]} />
                            </View>
                            <Text style={estilos.progresoTxt}>{completadosDia}/{ejerciciosDia.length} ejercicios</Text>
                        </View>
                    )}

                    {/* Card regenerar */}
                    <View style={estilos.generadorCardMini}>
                        <View style={estilos.generadorIconBoxMini}>
                            <Text style={{ fontSize: 18 }}>🤖</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.generadorTituloMini}>Generador de Rutina FORJA</Text>
                            <Text style={estilos.generadorSubMini}>
                                Objetivo: <Text style={{ color: AZUL }}>{objetivoLabel}</Text>
                                {perfil?.nivel ? ` · Nivel: ${perfil.nivel}` : ''}
                                {perfil?.dias_entrenamiento ? ` · ${perfil.dias_entrenamiento} días/sem` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity style={estilos.btnRegenerar} onPress={() => setModalDias(true)}>
                            <Text style={estilos.btnRegenerarIcono}>🔄</Text>
                            <Text style={estilos.btnRegenerarTxt}>Regenerar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Ejercicios */}
                    {ejerciciosDia.map((ej, ejIdx) => {
                        const clave = `${semanaActiva}_${diaActivo}_${ejIdx}`;
                        return (
                            <EjercicioCard
                                key={ejIdx}
                                ejercicio={ej}
                                numero={ejIdx + 1}
                                completado={!!completados[clave]}
                                guardando={guardandoIdx === clave}
                                onToggleCompletado={() => toggleEjercicio(diaActivo, ejIdx)}
                                onDolor={() => { setEjDolor(ej); setNotaDolor(''); setModalDolor(true); }}
                                onEditar={() => abrirEditar(ej, ejIdx)}
                                onEliminar={() => eliminarEjercicio(ejIdx)}
                                rir={rirPercibido[clave]}
                                onRirChange={v => cambiarRir(clave, v)}
                                onCambiarPeso={v => cambiarPeso(clave, v)}
                                onCambiarReps={v => cambiarReps(clave, v)}
                                onSustituir={() => {
                                    Alert.alert(
                                        `Sustituir por ${ej.sustitucion_nombre}`,
                                        '¿Quieres cambiar este ejercicio por su sustitución recomendada?',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Sustituir', onPress: () => {
                                                const nuevasSemanas = semanas.map(s => {
                                                    if (s.semana_numero !== semanaActiva) return s;
                                                    return { ...s, dias: s.dias.map((d, i) => {
                                                        if (i !== diaActivo) return d;
                                                        return { ...d, ejercicios: d.ejercicios.map((e, j) => {
                                                            if (j !== ejIdx) return e;
                                                            return { ...e, nombre: ej.sustitucion_nombre, ejercicio_id: ej.sustitucion_id, sustitucion_nombre: null };
                                                        })};
                                                    })};
                                                });
                                                setSemanas(nuevasSemanas);
                                            }}
                                        ]
                                    );
                                }}
                            />
                        );
                    })}

                    {/* Aviso IA */}
                    {ejerciciosDia.length > 0 && (
                        <View style={estilos.avisoIA}>
                            <Text style={estilos.avisoIAIcono}>◉</Text>
                            <Text style={estilos.avisoIATxt}>
                                Completa todos los ejercicios para que la IA de FORJA actualice tu fatiga muscular en el dashboard.
                            </Text>
                        </View>
                    )}

                    {/* Botones footer */}
                    <TouchableOpacity style={estilos.botonAnadir} onPress={() => setModalAnadir(true)}>
                        <Text style={estilos.botonAnadirTxt}>+ Añadir Ejercicio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.botonGuardar}>
                        <Text style={estilos.botonGuardarTxt}>Guardar Sesión</Text>
                    </TouchableOpacity>
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* ═══ MODALES ═══════════════════════════════════════════════════ */}

            {/* Modal selector de días */}
            <Modal visible={modalDias} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Configurar Rutina</Text>
                        <Text style={estilos.sheetDesc}>Selecciona los días de la semana que vas a entrenar.</Text>

                        {/* Tipo de plan */}
                        <View style={estilos.tipoPlanRow}>
                            {['semanal', 'mensual'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[estilos.tipoPlanTab, tipoPlan === t && estilos.tipoPlanActivo]}
                                    onPress={() => setTipoPlan(t)}
                                >
                                    <Text style={[estilos.tipoPlanTxt, tipoPlan === t && { color: '#fff' }]}>
                                        {t === 'semanal' ? 'Semanal' : 'Mensual (4 sem)'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Selector de días */}
                        <Text style={estilos.inputLabel}>Días de entrenamiento</Text>
                        <View style={estilos.diasSelectorRow}>
                            {DIAS_LABEL.map((dia, i) => {
                                const seleccionado = diasSeleccionados.includes(i);
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[estilos.diaSelectorBtn, seleccionado && estilos.diaSelectorBtnActivo]}
                                        onPress={() => {
                                            setDiasSeleccionados(prev =>
                                                prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()
                                            );
                                        }}
                                    >
                                        <Text style={[estilos.diaSelectorLetra, seleccionado && { color: '#fff' }]}>
                                            {DIAS_LETRA[i]}
                                        </Text>
                                        <Text style={[estilos.diaSelectorNombre, seleccionado && { color: '#fff' }]}>
                                            {dia}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={estilos.diasCount}>{diasSeleccionados.length} días seleccionados</Text>

                        <TouchableOpacity
                            style={[estilos.modalBtn, diasSeleccionados.length === 0 && { opacity: 0.4 }]}
                            onPress={generarRutina}
                            disabled={diasSeleccionados.length === 0}
                        >
                            <Text style={estilos.modalBtnTxt}>✨ Generar Rutina</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={estilos.modalBtnGris} onPress={() => setModalDias(false)}>
                            <Text style={estilos.modalBtnGrisTxt}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal editar ejercicio */}
            <Modal visible={modalEditar} transparent animationType="slide">
                <TouchableOpacity style={estilos.modalOverlay} activeOpacity={1} onPress={() => setModalEditar(false)}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Editar ejercicio</Text>
                        <Text style={estilos.inputLabel}>Nombre</Text>
                        <TextInput style={estilos.inputCampo} value={editNombre} onChangeText={setEditNombre} />
                        <View style={estilos.inputsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Series</Text>
                                <TextInput style={estilos.inputCampo} value={editSeries} onChangeText={setEditSeries} keyboardType="numeric" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Reps</Text>
                                <TextInput style={estilos.inputCampo} value={editReps} onChangeText={setEditReps} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Descanso</Text>
                                <TextInput style={estilos.inputCampo} value={editDescanso} onChangeText={setEditDescanso} />
                            </View>
                        </View>
                        <TouchableOpacity style={estilos.modalBtn} onPress={guardarEdicion}>
                            <Text style={estilos.modalBtnTxt}>Guardar cambios</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal añadir ejercicio */}
            <Modal visible={modalAnadir} transparent animationType="slide">
                <TouchableOpacity style={estilos.modalOverlay} activeOpacity={1} onPress={() => setModalAnadir(false)}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Añadir ejercicio</Text>
                        <TextInput style={estilos.inputCampo} placeholder="Nombre del ejercicio" placeholderTextColor={SUBTXT} value={nuevoNombre} onChangeText={setNuevoNombre} />
                        <View style={estilos.inputsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Series</Text>
                                <TextInput style={estilos.inputCampo} value={nuevaSeries} onChangeText={setNuevaSeries} keyboardType="numeric" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Reps</Text>
                                <TextInput style={estilos.inputCampo} value={nuevaReps} onChangeText={setNuevaReps} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.inputLabel}>Descanso</Text>
                                <TextInput style={estilos.inputCampo} value={nuevoDescanso} onChangeText={setNuevoDescanso} />
                            </View>
                        </View>
                        <TouchableOpacity style={estilos.modalBtn} onPress={confirmarAnadir}>
                            <Text style={estilos.modalBtnTxt}>Agregar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal dolor */}
            <Modal visible={modalDolor} transparent animationType="slide">
                <TouchableOpacity style={estilos.modalOverlay} activeOpacity={1} onPress={() => setModalDolor(false)}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>⚠️ Reportar Dolor</Text>
                        <Text style={estilos.sheetDesc}>Ejercicio: <Text style={{ color: NARANJA }}>{ejDolor?.nombre}</Text></Text>
                        <Text style={estilos.inputLabel}>¿Dónde sientes el dolor? (opcional)</Text>
                        <TextInput
                            style={[estilos.inputCampo, { minHeight: 80 }]}
                            placeholder="Ej: dolor en la rodilla derecha al bajar..."
                            placeholderTextColor={SUBTXT}
                            value={notaDolor}
                            onChangeText={setNotaDolor}
                            multiline
                        />
                        <TouchableOpacity
                            style={[estilos.modalBtn, { backgroundColor: ROJO }]}
                            onPress={() => {
                                setModalDolor(false);
                                reportarDolor(ejDolor?.nombre, notaDolor);
                            }}
                        >
                            <Text style={estilos.modalBtnTxt}>Reportar y continuar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={estilos.modalBtnGris} onPress={() => setModalDolor(false)}>
                            <Text style={estilos.modalBtnGrisTxt}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal fin sesión */}
            <Modal visible={modalFin} transparent animationType="fade">
                <View style={[estilos.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={estilos.modalCardCentro}>
                        <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
                        <Text style={estilos.modalTitulo}>¡Sesión completada!</Text>
                        <Text style={estilos.modalSub}>FORJA actualizará tu heatmap muscular y ajustará el plan de mañana.</Text>
                        <TouchableOpacity style={estilos.modalBtn} onPress={() => setModalFin(false)}>
                            <Text style={estilos.modalBtnTxt}>¡Genial! 💪</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: FONDO },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 55, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: FONDO, borderBottomWidth: 1, borderBottomColor: BORDE },
    headerIzq:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerLogoBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    headerLogo:    { fontSize: 20 },
    headerTitulo:  { color: TEXTO, fontSize: 18, fontWeight: '700' },
    headerSub:     { color: SUBTXT, fontSize: 11, marginTop: 1 },
    headerDer:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerIconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerIconTxt: { fontSize: 18 },
    avatarBox:     { width: 36, height: 36, borderRadius: 18, backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center' },
    avatarTxt:     { color: '#fff', fontSize: 14, fontWeight: '700' },

    // Semanas bar
    semanasBar: { maxHeight: 44, backgroundColor: FONDO },

    // Tabs días
    diasContenedor: { backgroundColor: FONDO, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDE },
    diasScroll:     { paddingHorizontal: 16, gap: 8 },
    diaTab:         { width: 52, height: 58, borderRadius: 14, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDE, position: 'relative' },
    diaTabActivo:   { backgroundColor: AZUL, borderColor: AZUL },
    diaTabLetra:    { color: SUBTXT, fontSize: 11, fontWeight: '700' },
    diaTabLetraActiva: { color: '#fff' },
    diaTabNombre:   { color: SUBTXT, fontSize: 13, fontWeight: '600', marginTop: 2 },
    diaTabNombreActivo: { color: '#fff' },
    diaTabCheck:    { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: VERDE, justifyContent: 'center', alignItems: 'center' },

    // Cargando / vacío
    cargandoBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    cargandoTxt: { color: TEXTO, fontSize: 16, fontWeight: '700', marginTop: 20, textAlign: 'center' },
    cargandoSub: { color: SUBTXT, fontSize: 13, marginTop: 8, textAlign: 'center' },
    vacio: { flex: 1, padding: 20, paddingTop: 40 },
    vacioDesc: { color: SUBTXT, fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 20 },

    // Card generador
    generadorCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: BORDE, marginBottom: 20 },
    generadorIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AZUL + '40' },
    generadorIcono:   { fontSize: 24 },
    generadorTitulo:  { color: TEXTO, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    generadorSub:     { color: SUBTXT, fontSize: 12, lineHeight: 18 },
    generadorCardMini:{ marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: BORDE },
    generadorIconBoxMini: { width: 40, height: 40, borderRadius: 12, backgroundColor: AZUL + '15', justifyContent: 'center', alignItems: 'center' },
    generadorTituloMini:  { color: TEXTO, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    generadorSubMini:     { color: SUBTXT, fontSize: 11 },
    btnRegenerar: { backgroundColor: NARANJA, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    btnRegenerarIcono: { fontSize: 14 },
    btnRegenerarTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

    // Info día
    diaInfo:    { paddingHorizontal: 16, paddingVertical: 14 },
    diaInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    diaInfoTitulo: { color: TEXTO, fontSize: 20, fontWeight: '800' },
    diaInfoSub:    { color: SUBTXT, fontSize: 13, marginTop: 3 },
    intensidadBadge: { backgroundColor: '#2d1a0a', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: NARANJA },
    intensidadTxt:   { color: NARANJA, fontSize: 12, fontWeight: '700' },
    progresoFondo:   { height: 3, backgroundColor: BORDE, borderRadius: 2, marginBottom: 4 },
    progresoRelleno: { height: 3, backgroundColor: AZUL, borderRadius: 2 },
    progresoTxt:     { color: SUBTXT, fontSize: 11 },

    // Card ejercicio
    ejCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    ejCardCompleto: { borderColor: VERDE + '40' },
    ejHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    ejNumBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: AZUL + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: AZUL + '40' },
    ejNumTxt:   { color: AZUL, fontSize: 13, fontWeight: '800' },
    ejNombre:   { color: TEXTO, fontSize: 15, fontWeight: '700', marginBottom: 5 },
    nombreTachado: { textDecorationLine: 'line-through', color: SUBTXT },
    ejPillsRow: { flexDirection: 'row', gap: 6 },
    pill:       { backgroundColor: CARD2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDE },
    pillTxt:    { color: SUBTXT, fontSize: 11, fontWeight: '600' },
    ejAcciones: { flexDirection: 'row', gap: 4 },
    accionBtn:  { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    accionIcono:{ fontSize: 16 },
    chevron:    { color: SUBTXT, fontSize: 14, fontWeight: '700', marginLeft: 4 },

    // Video
    videoContenedor:  { position: 'relative' },
    videoEjercicio:   { width: '100%', height: 200, backgroundColor: '#1a1a1a' },
    videoPlaceholder: { width: '100%', height: 200, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
    playTxt: { color: '#fff', fontSize: 20, marginLeft: 4 },
    checkbox: { position: 'absolute', top: 10, left: 10, zIndex: 10, width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
    checkboxActivo: { backgroundColor: AZUL, borderColor: AZUL },
    checkTxt:       { color: '#fff', fontSize: 15, fontWeight: '900' },

    // Nota técnica y pausa
    notaRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
    notaIcono:  { color: AZUL, fontSize: 14 },
    notaTxt:    { color: SUBTXT, fontSize: 13, lineHeight: 20, flex: 1 },
    pausaTxt:   { color: NARANJA, fontSize: 12, fontWeight: '700', fontStyle: 'italic', paddingHorizontal: 14, paddingTop: 4 },

    // Sustitución
    sustitucionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 10, backgroundColor: AZUL + '10', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: AZUL + '30' },
    sustitucionIcono: { fontSize: 16 },
    sustitucionTxt:   { color: SUBTXT, fontSize: 13, flex: 1 },
    sustitucionNombre:{ color: AZUL, fontWeight: '700' },

    // Inputs grid
    inputsGrid:  { flexDirection: 'row', padding: 14, paddingTop: 12, gap: 10 },
    inputGrupo:  { flex: 1 },
    inputLabel:  { color: SUBTXT, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    inputSpinner:{ flexDirection: 'row', alignItems: 'center', backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    spinnerBtn:  { paddingHorizontal: 8, paddingVertical: 10, backgroundColor: CARD2 },
    spinnerTxt:  { color: SUBTXT, fontSize: 14, fontWeight: '700' },
    spinnerInput:{ flex: 1, color: TEXTO, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },

    // Botones Completado / Dolor
    botonesRow:       { flexDirection: 'row', padding: 14, paddingTop: 8, gap: 10 },
    btnCompletado:    { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: CARD2, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: BORDE },
    btnCompletadoActivo:{ backgroundColor: NARANJA, borderColor: NARANJA },
    btnCompletadoIcono: { fontSize: 18 },
    btnCompletadoTxt:   { color: TEXTO, fontSize: 14, fontWeight: '700' },
    btnDolor:    { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: ROJO + '15', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: ROJO + '40' },
    btnDolorIcono:{ color: ROJO, fontSize: 16 },
    btnDolorTxt:  { color: ROJO, fontSize: 14, fontWeight: '700' },

    // Aviso IA y footer
    avisoIA:    { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0f1929', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#1e3a5f' },
    avisoIAIcono: { color: AZUL, fontSize: 18 },
    avisoIATxt:   { color: SUBTXT, fontSize: 13, lineHeight: 20, flex: 1 },
    botonAnadir:  { marginHorizontal: 16, marginBottom: 10, paddingVertical: 15, borderRadius: 12, borderWidth: 1.5, borderColor: BORDE, borderStyle: 'dashed', alignItems: 'center', backgroundColor: CARD },
    botonAnadirTxt: { color: TEXTO, fontSize: 15, fontWeight: '700' },
    botonGuardar:   { marginHorizontal: 16, marginBottom: 16, paddingVertical: 17, borderRadius: 14, backgroundColor: AZUL, alignItems: 'center', shadowColor: AZUL, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    botonGuardarTxt:{ color: '#fff', fontSize: 16, fontWeight: '800' },

    // RIR dropdown
    rirOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    rirMenu:        { backgroundColor: CARD, borderRadius: 14, paddingVertical: 8, width: 200, borderWidth: 1, borderColor: BORDE },
    rirMenuTitulo:  { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDE, marginBottom: 4 },
    rirOpcion:      { paddingHorizontal: 20, paddingVertical: 12 },
    rirOpcionActiva:{ backgroundColor: '#1a2a3a' },
    rirOpcionTxt:   { color: TEXTO, fontSize: 15, fontWeight: '600' },

    // Modales
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    bottomSheet:    { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDE },
    sheetHandle:    { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo:    { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    sheetDesc:      { color: SUBTXT, fontSize: 13, marginBottom: 16, lineHeight: 20 },
    tipoPlanRow:    { flexDirection: 'row', backgroundColor: CARD2, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: BORDE },
    tipoPlanTab:    { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tipoPlanActivo: { backgroundColor: AZUL },
    tipoPlanTxt:    { color: SUBTXT, fontSize: 13, fontWeight: '600' },
    diasSelectorRow:{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
    diaSelectorBtn: { width: 44, paddingVertical: 10, borderRadius: 12, backgroundColor: CARD2, alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    diaSelectorBtnActivo: { backgroundColor: AZUL, borderColor: AZUL },
    diaSelectorLetra:{ color: SUBTXT, fontSize: 11, fontWeight: '700' },
    diaSelectorNombre:{ color: SUBTXT, fontSize: 12, marginTop: 2 },
    diasCount:      { color: AZUL, fontSize: 12, fontWeight: '700', marginBottom: 16 },
    inputsRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
    inputCampo:     { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, borderRadius: 10, padding: 12, color: TEXTO, fontSize: 14, marginBottom: 10 },
    modalBtn:       { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    modalBtnTxt:    { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalBtnGris:   { paddingVertical: 14, alignItems: 'center' },
    modalBtnGrisTxt:{ color: SUBTXT, fontSize: 14 },
    semanaTab:      { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE },
    semanaTabActivo:{ backgroundColor: AZUL, borderColor: AZUL },
    semanaTabTxt:   { color: SUBTXT, fontSize: 12, fontWeight: '600' },
    modalCardCentro:{ backgroundColor: CARD, borderRadius: 24, padding: 28, alignItems: 'center', width: '88%', borderWidth: 1, borderColor: BORDE },
    modalTitulo:    { color: TEXTO, fontSize: 21, fontWeight: '800', marginBottom: 8 },
    modalSub:       { color: SUBTXT, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
});