import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Switch, Image, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import HeaderForja from '../components/HeaderForja';

const FONDO   = '#0a0a0a';
const CARD    = '#0f1117';
const CARD2   = '#1a1d27';
const BORDE   = '#2a2d3a';
const AZUL    = '#f97316'; // naranja como en capturas
const AZUL2   = '#3b82f6'; // azul real para acciones secundarias
const TEXTO   = '#ffffff';
const SUBTXT  = '#8b92a5';
const VERDE   = '#22c55e';
const ROJO    = '#ef4444';
const ROSA    = '#ec4899';

const TIPOS_DIETA = [
    { key: 'omnivora',     label: 'Omnívora'    },
    { key: 'vegetariana',  label: 'Vegetariana' },
    { key: 'vegana',       label: 'Vegana'      },
    { key: 'keto',         label: 'Keto'        },
    { key: 'mediterranea', label: 'Mediterránea'},
];

const ALERGIAS_COMUNES = [
    'Gluten', 'Lactosa', 'Huevo', 'Frutos secos',
    'Soja', 'Mariscos', 'Pescado', 'Cacahuetes',
];

// ── Componente sección con título e icono ────────────────────────────────────
function Seccion({ icono, titulo, color, children }) {
    return (
        <View style={secEstilos.card}>
            <View style={secEstilos.header}>
                <View style={[secEstilos.iconBox, { backgroundColor: (color || '#f97316') + '20' }]}>
                    <Text style={secEstilos.icono}>{icono}</Text>
                </View>
                <Text style={secEstilos.titulo}>{titulo}</Text>
            </View>
            {children}
        </View>
    );
}
const secEstilos = StyleSheet.create({
    card:    { backgroundColor: CARD, borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 18, borderWidth: 1, borderColor: BORDE },
    header:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    icono:   { fontSize: 20 },
    titulo:  { color: TEXTO, fontSize: 17, fontWeight: '800' },
});

// ── Campo de formulario tipo input ───────────────────────────────────────────
function Campo({ label, value, onChangeText, keyboardType, placeholder, editable = true, suffix }) {
    return (
        <View style={campoEstilos.caja}>
            <Text style={campoEstilos.label}>{label}</Text>
            <View style={campoEstilos.inputRow}>
                <TextInput
                    style={[campoEstilos.input, !editable && campoEstilos.inputDesactivado]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType || 'default'}
                    placeholder={placeholder || ''}
                    placeholderTextColor={SUBTXT}
                    editable={editable}
                />
                {suffix && <Text style={campoEstilos.suffix}>{suffix}</Text>}
            </View>
        </View>
    );
}
const campoEstilos = StyleSheet.create({
    caja:           { flex: 1 },
    label:          { color: SUBTXT, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    inputRow:       { flexDirection: 'row', alignItems: 'center' },
    input:          { flex: 1, backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    inputDesactivado:{ opacity: 0.5 },
    suffix:         { color: SUBTXT, fontSize: 13, marginLeft: 8 },
});

// ── Selector tipo dropdown con chips ─────────────────────────────────────────
function SelectorChips({ label, opciones, valor, onChange }) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={campoEstilos.label}>{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {opciones.map(op => (
                    <TouchableOpacity
                        key={op.key}
                        style={[chipEstilos.chip, valor === op.key && chipEstilos.chipActivo]}
                        onPress={() => onChange(op.key)}
                    >
                        <Text style={[chipEstilos.txt, valor === op.key && chipEstilos.txtActivo]}>
                            {op.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
const chipEstilos = StyleSheet.create({
    chip:      { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE },
    chipActivo:{ backgroundColor: AZUL + '20', borderColor: AZUL },
    txt:       { color: SUBTXT, fontSize: 13, fontWeight: '600' },
    txtActivo: { color: AZUL },
});

// ── Fila de selector numérico tipo stepper ────────────────────────────────────
function StepperRow({ label, value, onInc, onDec, min, max }) {
    return (
        <View style={stepEstilos.fila}>
            <Text style={stepEstilos.label}>{label}</Text>
            <View style={stepEstilos.controles}>
                <TouchableOpacity style={stepEstilos.btn} onPress={onDec} disabled={value <= (min ?? 0)}>
                    <Text style={stepEstilos.btnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={stepEstilos.valor}>{value}</Text>
                <TouchableOpacity style={stepEstilos.btn} onPress={onInc} disabled={value >= (max ?? 99)}>
                    <Text style={stepEstilos.btnTxt}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
const stepEstilos = StyleSheet.create({
    fila:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDE },
    label:     { color: TEXTO, fontSize: 14, fontWeight: '600' },
    controles: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    btn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, justifyContent: 'center', alignItems: 'center' },
    btnTxt:    { color: TEXTO, fontSize: 18, fontWeight: '700', marginTop: -1 },
    valor:     { color: TEXTO, fontSize: 16, fontWeight: '800', minWidth: 28, textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function PerfilScreen({ navigation }) {
    const [perfil, setPerfil]         = useState(null);
    const [cargando, setCargando]     = useState(true);
    const [guardando, setGuardando]   = useState(false);
    const [cerrando, setCerrando]     = useState(false);
    const [subiendoFoto, setSubiendoFoto] = useState(false);

    // Datos básicos editables
    const [nombre, setNombre]         = useState('');
    const [sexo, setSexo]             = useState('hombre');
    const [altura, setAltura]         = useState('');
    const [peso, setPeso]             = useState('');
    const [nivel, setNivel]           = useState('intermedio');
    const [diasEntreno, setDiasEntreno] = useState(4);
    const [objetivo, setObjetivo]     = useState('perder_grasa');
    const [pesoObj, setPesoObj]       = useState('');
    const [grasaObj, setGrasaObj]     = useState('');

    // Salud
    const [patologias, setPatologias] = useState('');
    const [lesiones, setLesiones]     = useState('');

    // Ciclo
    const [tieneCiclo, setTieneCiclo]         = useState(false);
    const [fechaCiclo, setFechaCiclo]         = useState('');
    const [duracionCiclo, setDuracionCiclo]   = useState(28);

    // Preferencias alimentarias
    const [tipoDieta, setTipoDieta]           = useState('omnivora');
    const [alergias, setAlergias]             = useState([]);
    const [noGusta, setNoGusta]               = useState('');
    const [favoritos, setFavoritos]           = useState('');
    const [comidasDiarias, setComidasDiarias] = useState(5);

    // Modal alimentación
    const [modalAlim, setModalAlim]   = useState(false);

    useFocusEffect(useCallback(() => { cargarPerfil(); }, []));

    async function cargarPerfil() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const resp  = await axios.get(
                `${API_URL}/usuario/perfil.php`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            if (resp.data) {
                const p = resp.data;
                setPerfil(p);
                setNombre(p.nombre || '');
                setSexo(p.sexo || 'hombre');
                setAltura(p.altura_cm ? String(p.altura_cm) : '');
                setPeso(p.peso_actual ? String(p.peso_actual) : '');
                setNivel(p.nivel || 'intermedio');
                setDiasEntreno(parseInt(p.dias_entrenamiento) || 4);
                setObjetivo(p.objetivo || 'perder_grasa');
                setPesoObj(p.peso_objetivo ? String(p.peso_objetivo) : '');
                setGrasaObj(p.grasa_objetivo ? String(p.grasa_objetivo) : '');
                setPatologias(p.patologias?.join(', ') || '');
                setTieneCiclo(!!p.tiene_ciclo);
                setFechaCiclo(p.fecha_ultimo_ciclo || '');
                setDuracionCiclo(parseInt(p.duracion_ciclo) || 28);
                setTipoDieta(p.tipo_dieta || 'omnivora');
                setComidasDiarias(parseInt(p.comidas_diarias) || 5);
                try { setAlergias(p.alergias ? JSON.parse(p.alergias) : []); } catch { setAlergias([]); }
                try {
                    const ng = p.alimentos_no_gusta ? JSON.parse(p.alimentos_no_gusta) : [];
                    setNoGusta(ng.join(', '));
                } catch { setNoGusta(''); }
                try {
                    const fav = p.alimentos_favoritos ? JSON.parse(p.alimentos_favoritos) : [];
                    setFavoritos(fav.join(', '));
                } catch { setFavoritos(''); }
            }
        } catch (e) { console.log('Error perfil:', e.message); }
        finally { setCargando(false); }
    }

    async function guardarPerfil() {
        if (!nombre.trim()) { Alert.alert('Error', 'El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const token    = await AsyncStorage.getItem('forja_token');
            const ngArr    = noGusta.split(',').map(s => s.trim()).filter(Boolean);
            const favArr   = favoritos.split(',').map(s => s.trim()).filter(Boolean);
            const patsArr  = patologias.split(',').map(s => s.trim()).filter(Boolean);

            await axios.post(
                `${API_URL}/usuario/actualizar-perfil.php`,
                {
                    nombre:             nombre.trim(),
                    sexo,
                    altura_cm:          parseFloat(altura)  || null,
                    peso_actual:        parseFloat(peso)    || null,
                    peso_objetivo:      parseFloat(pesoObj) || null,
                    grasa_objetivo:     parseFloat(grasaObj)|| null,
                    nivel,
                    objetivo,
                    dias_entrenamiento: diasEntreno,
                    tiene_ciclo:        tieneCiclo ? 1 : 0,
                    fecha_ultimo_ciclo: tieneCiclo ? fechaCiclo : null,
                    duracion_ciclo:     duracionCiclo,
                    tipo_dieta:         tipoDieta,
                    alergias:           JSON.stringify(alergias),
                    alimentos_no_gusta: JSON.stringify(ngArr),
                    alimentos_favoritos:JSON.stringify(favArr),
                    comidas_diarias:    comidasDiarias,
                    patologias:         patsArr,
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
            );
            await cargarPerfil();
            Alert.alert('✅', 'Perfil guardado correctamente.');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'No se pudo guardar.');
        } finally { setGuardando(false); }
    }

    async function cambiarFoto() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
            setSubiendoFoto(true);
            try {
                const token   = await AsyncStorage.getItem('forja_token');
                const asset   = result.assets[0];
                const formData = new FormData();
                formData.append('foto', { uri: asset.uri, type: 'image/jpeg', name: 'foto.jpg' });
                const resp = await axios.post(`${API_URL}/usuario/subir-foto.php`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                    timeout: 20000,
                });
                if (resp.data?.foto_perfil) {
                    setPerfil(prev => ({ ...prev, foto_perfil: resp.data.foto_perfil }));
                    Alert.alert('✅', 'Foto actualizada.');
                }
            } catch { Alert.alert('Error', 'No se pudo subir la foto.'); }
            finally { setSubiendoFoto(false); }
        }
    }

    function toggleAlergia(a) {
        const norm = a.toLowerCase();
        setAlergias(prev => prev.includes(norm) ? prev.filter(x => x !== norm) : [...prev, norm]);
    }

    async function cerrarSesion() {
        Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Cerrar', style: 'destructive', onPress: async () => {
                    setCerrando(true);
                    await AsyncStorage.multiRemove(['forja_token', 'forja_usuario_id', 'forja_completados', 'forja_rir', 'forja_comidas_completadas']);
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
            }
        ]);
    }

    // ── Cálculo TMB / mantenimiento / objetivo kcal ──────────────────────────
    function calcularCalorias() {
        const h = parseFloat(altura) || 0;
        const p = parseFloat(peso)   || 0;
        const esMujer = sexo === 'mujer';
        if (!h || !p) return null;
        const tmb = esMujer ? (10 * p + 6.25 * h - 5 * 30 - 161) : (10 * p + 6.25 * h - 5 * 30 + 5);
        const factores = { 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.725, 6: 1.9 };
        const factor   = factores[diasEntreno] || 1.55;
        const mant     = Math.round(tmb * factor);
        const extra    = objetivo === 'ganar_musculo' ? 400 : objetivo === 'perder_grasa' ? -400 : 0;
        return { tmb: Math.round(tmb), mant, objetivo: mant + extra };
    }
    const cals = calcularCalorias();
    const fotoUrl = perfil?.foto_perfil
        ? (perfil.foto_perfil.startsWith('http') ? perfil.foto_perfil : `${API_URL}/public/${perfil.foto_perfil}`)
        : null;
    const nivelLabel = nivel === 'avanzado' ? 'BIO-ELITE' : nivel === 'intermedio' ? 'PRO' : 'STARTER';
    const usuarioId  = perfil?.id ? `FORJA-${String(perfil.id).padStart(4, '0')}` : '';

    if (cargando) {
        return (
            <View style={{ flex: 1, backgroundColor: FONDO, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={AZUL} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: FONDO }}>
            <HeaderForja derecha={
                <Text style={{ color: AZUL, fontSize: 14, fontWeight: '700' }}>
                    {/* vacío por ahora */}
                </Text>
            } />

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── TÍTULO ── */}
                <Text style={estilos.paginaTitulo}>Perfil</Text>

                {/* ── AVATAR + NOMBRE ── */}
                <View style={estilos.avatarCardRow}>
                    <TouchableOpacity onPress={cambiarFoto} disabled={subiendoFoto} style={estilos.avatarWrap}>
                        {subiendoFoto ? (
                            <View style={estilos.avatarCirculo}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        ) : fotoUrl ? (
                            <Image source={{ uri: fotoUrl }} style={estilos.avatarCirculo} />
                        ) : (
                            <View style={estilos.avatarCirculo}>
                                <Text style={estilos.avatarLetra}>{nombre?.charAt(0)?.toUpperCase() || 'U'}</Text>
                            </View>
                        )}
                        <View style={estilos.avatarCamara}><Text style={{ fontSize: 12 }}>📷</Text></View>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.avatarNombre}>{nombre || 'Usuario'}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <View style={estilos.nivelBadge}>
                                <Text style={estilos.nivelTxt}>{nivelLabel}</Text>
                            </View>
                            {!!usuarioId && <Text style={{ color: SUBTXT, fontSize: 12, alignSelf: 'center' }}>ID: {usuarioId}</Text>}
                        </View>
                    </View>
                    {/* Botón cambiar foto texto */}
                    <TouchableOpacity onPress={cambiarFoto}>
                        <Text style={{ color: AZUL2, fontSize: 13, fontWeight: '600' }}>Cambiar</Text>
                    </TouchableOpacity>
                </View>

                {/* ══ SECCIÓN: DATOS PERSONALES ══════════════════════════════ */}
                <Seccion icono="👤" titulo="Datos Personales" color="#f97316">
                    <Campo label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre completo" />

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                        <SelectorChips
                            label="Sexo"
                            opciones={[{ key: 'hombre', label: 'Hombre' }, { key: 'mujer', label: 'Mujer' }]}
                            valor={sexo}
                            onChange={setSexo}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                        <Campo label="Altura (cm)" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" placeholder="170" />
                        <View style={{ width: 12 }} />
                        <Campo label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder="75" />
                    </View>

                    <View style={{ marginTop: 14 }}>
                        <SelectorChips
                            label="Nivel"
                            opciones={[
                                { key: 'principiante', label: 'Principiante' },
                                { key: 'intermedio',   label: 'Intermedio'   },
                                { key: 'avanzado',     label: 'Avanzado'     },
                            ]}
                            valor={nivel}
                            onChange={setNivel}
                        />
                    </View>

                    <View style={{ marginTop: 4 }}>
                        <StepperRow
                            label="Días Entrenamiento"
                            value={diasEntreno}
                            onInc={() => setDiasEntreno(v => Math.min(7, v + 1))}
                            onDec={() => setDiasEntreno(v => Math.max(1, v - 1))}
                            min={1} max={7}
                        />
                    </View>
                </Seccion>

                {/* ══ SECCIÓN: OBJETIVO ══════════════════════════════════════ */}
                <Seccion icono="🎯" titulo="Objetivo" color="#f97316">
                    <SelectorChips
                        label="Objetivo"
                        opciones={[
                            { key: 'perder_grasa',  label: 'Perder Grasa'   },
                            { key: 'ganar_musculo', label: 'Ganar Músculo'  },
                            { key: 'recomposicion', label: 'Recomposición'  },
                            { key: 'mantenimiento', label: 'Mantenimiento'  },
                            { key: 'rendimiento',   label: 'Rendimiento'    },
                        ]}
                        valor={objetivo}
                        onChange={setObjetivo}
                    />

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <Campo label="Peso objetivo (kg)" value={pesoObj} onChangeText={setPesoObj} keyboardType="decimal-pad" placeholder="70" />
                        <View style={{ width: 12 }} />
                        <Campo label="% Grasa objetivo" value={grasaObj} onChangeText={setGrasaObj} keyboardType="decimal-pad" placeholder="12" />
                    </View>

                    {/* Cálculo de calorías */}
                    {cals && (
                        <View style={estilos.calsRow}>
                            <View style={estilos.calItem}>
                                <Text style={[estilos.calVal, { color: AZUL }]}>{cals.tmb}</Text>
                                <Text style={estilos.calLabel}>TMB (kcal)</Text>
                            </View>
                            <View style={estilos.calItem}>
                                <Text style={estilos.calVal}>{cals.mant}</Text>
                                <Text style={estilos.calLabel}>Mantenimiento</Text>
                            </View>
                            <View style={estilos.calItem}>
                                <Text style={[estilos.calVal, { color: AZUL }]}>{cals.objetivo}</Text>
                                <Text style={estilos.calLabel}>Objetivo kcal</Text>
                            </View>
                        </View>
                    )}
                </Seccion>

                {/* ══ SECCIÓN: SALUD ═════════════════════════════════════════ */}
                <Seccion icono="❤️" titulo="Salud" color="#22c55e">
                    <Text style={campoEstilos.label}>Patologías</Text>
                    <TextInput
                        style={estilos.textArea}
                        value={patologias}
                        onChangeText={setPatologias}
                        placeholder="Ej: diabetes, hipertensión... (separadas por coma)"
                        placeholderTextColor={SUBTXT}
                        multiline
                    />

                    <Text style={[campoEstilos.label, { marginTop: 14 }]}>Lesiones</Text>
                    <TextInput
                        style={estilos.textArea}
                        value={lesiones}
                        onChangeText={setLesiones}
                        placeholder="Ej: Tendinitis hombro derecho..."
                        placeholderTextColor={SUBTXT}
                        multiline
                    />

                    {/* Ciclo menstrual */}
                    <View style={estilos.cicloRow}>
                        <Text style={{ color: ROSA, fontSize: 14, fontWeight: '600' }}>♡  Seguimiento ciclo menstrual</Text>
                        <Switch
                            value={tieneCiclo}
                            onValueChange={setTieneCiclo}
                            trackColor={{ false: CARD2, true: ROSA }}
                            thumbColor="#fff"
                        />
                    </View>

                    {tieneCiclo && (
                        <View style={estilos.cicloCard}>
                            <Text style={[estilos.cicloTitulo]}>Registrar Ciclo</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={campoEstilos.label}>Fecha inicio último periodo</Text>
                                    <TextInput
                                        style={estilos.inputFecha}
                                        value={fechaCiclo}
                                        onChangeText={setFechaCiclo}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={SUBTXT}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={campoEstilos.label}>Duración ciclo (días)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            style={estilos.stepBtn}
                                            onPress={() => setDuracionCiclo(v => Math.max(21, v - 1))}
                                        >
                                            <Text style={estilos.stepBtnTxt}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={estilos.stepVal}>{duracionCiclo}</Text>
                                        <TouchableOpacity
                                            style={estilos.stepBtn}
                                            onPress={() => setDuracionCiclo(v => Math.min(35, v + 1))}
                                        >
                                            <Text style={estilos.stepBtnTxt}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            {perfil?.fecha_ultimo_ciclo && (
                                <Text style={estilos.cicloUltimo}>Último registro: {perfil.fecha_ultimo_ciclo}</Text>
                            )}
                        </View>
                    )}
                </Seccion>

                {/* ══ SECCIÓN: PREFERENCIAS ALIMENTARIAS ════════════════════ */}
                <Seccion icono="🥗" titulo="Preferencias Alimentarias" color="#3b82f6">
                    <Text style={estilos.prefDesc}>La IA usará estos datos para generar tu plan nutricional personalizado.</Text>

                    {/* Comidas al día */}
                    <Text style={[campoEstilos.label, { marginBottom: 10 }]}>¿Cuántas comidas al día?</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                        {[
                            { n: 3, label: '3\nBásico'    },
                            { n: 4, label: '4\n+Merienda' },
                            { n: 5, label: '5\n+Media\nmañana' },
                            { n: 6, label: '6\nTodas'     },
                        ].map(({ n, label }) => (
                            <TouchableOpacity
                                key={n}
                                style={[estilos.comidaBtn, comidasDiarias === n && estilos.comidaBtnActivo]}
                                onPress={() => setComidasDiarias(n)}
                            >
                                <Text style={[estilos.comidaBtnTxt, comidasDiarias === n && { color: '#fff' }]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <SelectorChips
                        label="Tipo de dieta"
                        opciones={TIPOS_DIETA}
                        valor={tipoDieta}
                        onChange={setTipoDieta}
                    />

                    {/* Alergias */}
                    <Text style={[campoEstilos.label, { marginTop: 4 }]}>Alergias e intolerancias</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {ALERGIAS_COMUNES.map(a => {
                            const norm   = a.toLowerCase();
                            const activo = alergias.includes(norm);
                            return (
                                <TouchableOpacity
                                    key={a}
                                    style={[chipEstilos.chip, activo && { backgroundColor: ROJO + '15', borderColor: ROJO + '60' }]}
                                    onPress={() => toggleAlergia(a)}
                                >
                                    <Text style={[chipEstilos.txt, activo && { color: ROJO }]}>{a}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={campoEstilos.label}>Alimentos que NO me gustan</Text>
                    <TextInput
                        style={[estilos.textArea, { marginBottom: 14 }]}
                        value={noGusta}
                        onChangeText={setNoGusta}
                        placeholder="Ej: hígado, coliflor... (separados por coma)"
                        placeholderTextColor={SUBTXT}
                        multiline
                    />

                    <Text style={campoEstilos.label}>Alimentos favoritos</Text>
                    <TextInput
                        style={estilos.textArea}
                        value={favoritos}
                        onChangeText={setFavoritos}
                        placeholder="Ej: pollo, arroz, huevos... (separados por coma)"
                        placeholderTextColor={SUBTXT}
                        multiline
                    />
                </Seccion>

                {/* ══ BOTÓN GUARDAR ══════════════════════════════════════════ */}
                <TouchableOpacity
                    style={[estilos.btnGuardar, guardando && { opacity: 0.6 }]}
                    onPress={guardarPerfil}
                    disabled={guardando}
                >
                    {guardando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Text style={{ fontSize: 18 }}>💾</Text>
                            <Text style={estilos.btnGuardarTxt}>Guardar Perfil</Text>
                        </>
                    }
                </TouchableOpacity>

                {/* ══ CERRAR SESIÓN ══════════════════════════════════════════ */}
                <TouchableOpacity style={estilos.btnCerrar} onPress={cerrarSesion} disabled={cerrando}>
                    {cerrando
                        ? <ActivityIndicator color={ROJO} size="small" />
                        : <Text style={estilos.btnCerrarTxt}>↪  Cerrar Sesión Biológica</Text>
                    }
                </TouchableOpacity>

                <Text style={estilos.versionTxt}>FORJA v2.4.1 — Desarrollado bajo protocolo de alto rendimiento deportivo.</Text>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
    paginaTitulo: { color: TEXTO, fontSize: 28, fontWeight: '900', paddingHorizontal: 20, paddingVertical: 12 },

    // Avatar row
    avatarCardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 20, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    avatarWrap:    { position: 'relative' },
    avatarCirculo: { width: 60, height: 60, borderRadius: 30, backgroundColor: AZUL + '30', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: AZUL },
    avatarLetra:   { color: AZUL, fontSize: 22, fontWeight: '900' },
    avatarCamara:  { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, justifyContent: 'center', alignItems: 'center' },
    avatarNombre:  { color: TEXTO, fontSize: 17, fontWeight: '800' },
    nivelBadge:    { backgroundColor: AZUL + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: AZUL + '50' },
    nivelTxt:      { color: AZUL, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    // Calorías
    calsRow:    { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, backgroundColor: CARD2, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: BORDE },
    calItem:    { alignItems: 'center', gap: 4 },
    calVal:     { color: TEXTO, fontSize: 22, fontWeight: '900' },
    calLabel:   { color: SUBTXT, fontSize: 11 },

    // Textarea
    textArea: { backgroundColor: CARD2, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 12, fontSize: 14, minHeight: 68, textAlignVertical: 'top' },

    // Ciclo
    cicloRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDE },
    cicloCard:   { marginTop: 14, backgroundColor: CARD2, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: ROSA + '30' },
    cicloTitulo: { color: ROSA, fontSize: 15, fontWeight: '800' },
    cicloUltimo: { color: SUBTXT, fontSize: 12, marginTop: 10 },
    inputFecha:  { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDE, color: TEXTO, padding: 10, fontSize: 13 },
    stepBtn:     { width: 32, height: 32, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDE, justifyContent: 'center', alignItems: 'center' },
    stepBtnTxt:  { color: TEXTO, fontSize: 18, fontWeight: '700', marginTop: -1 },
    stepVal:     { color: TEXTO, fontSize: 16, fontWeight: '800', minWidth: 28, textAlign: 'center' },

    // Preferencias alimentarias
    prefDesc:    { color: SUBTXT, fontSize: 13, marginBottom: 16, lineHeight: 19 },
    comidaBtn:   { flex: 1, backgroundColor: CARD2, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    comidaBtnActivo: { backgroundColor: AZUL, borderColor: AZUL },
    comidaBtnTxt:{ color: SUBTXT, fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 17 },

    // Botón guardar
    btnGuardar:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: AZUL, borderRadius: 14, paddingVertical: 18, shadowColor: AZUL, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    btnGuardarTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },

    // Botón cerrar sesión
    btnCerrar:    { marginHorizontal: 16, marginBottom: 16, backgroundColor: ROJO + '12', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: ROJO + '30' },
    btnCerrarTxt: { color: ROJO, fontSize: 15, fontWeight: '700' },

    versionTxt: { color: '#2a2a2a', fontSize: 11, textAlign: 'center', paddingHorizontal: 20, marginBottom: 8 },
});r