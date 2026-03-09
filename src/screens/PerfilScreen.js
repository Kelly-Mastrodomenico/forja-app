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
const CARD    = '#111111';
const CARD2   = '#1a1a1a';
const BORDE   = '#2a2a2a';
const AZUL    = '#3b82f6';
const NARANJA = '#f97316';
const TEXTO   = '#ffffff';
const SUBTXT  = '#6b7280';
const VERDE   = '#22c55e';
const ROJO    = '#ef4444';

const TIPOS_DIETA = [
    { key: 'omnivora',       label: 'Omnívora'       },
    { key: 'vegetariana',    label: 'Vegetariana'    },
    { key: 'vegana',         label: 'Vegana'         },
    { key: 'keto',           label: 'Keto'           },
    { key: 'mediterranea',   label: 'Mediterránea'   },
];

const ALERGIAS_COMUNES = [
    'Gluten', 'Lactosa', 'Huevo', 'Frutos secos',
    'Soja', 'Mariscos', 'Pescado', 'Cacahuetes',
];

export default function PerfilScreen({ navigation }) {
    const [perfil, setPerfil]           = useState(null);
    const [cargando, setCargando]       = useState(true);
    const [cerrando, setCerrando]       = useState(false);
    const [subiendoFoto, setSubiendoFoto] = useState(false);

    // Modales
    const [modalInfo, setModalInfo]         = useState(false);
    const [modalAlimentacion, setModalAlimentacion] = useState(false);

    // Toggles privacidad
    const [cicloHormonal, setCicloHormonal]       = useState(true);
    const [appleHealth, setAppleHealth]           = useState(true);
    const [marcadoresSangre, setMarcadoresSangre] = useState(false);

    // Estado edición preferencias alimentarias
    const [tipoDieta, setTipoDieta]           = useState('omnivora');
    const [alergiasSeleccionadas, setAlergiasSeleccionadas] = useState([]);
    const [noGusta, setNoGusta]               = useState('');
    const [favoritos, setFavoritos]           = useState('');
    const [guardandoAlim, setGuardandoAlim]   = useState(false);

    const dispositivos = [
        { nombre: 'Apple Watch Series 9', estado: 'CONECTADO',    icono: '⌚', conectado: true,  tiempo: 'Hace 2 min' },
        { nombre: 'Báscula Smart BLE',    estado: 'DESCONECTADO', icono: '⚖️', conectado: false, tiempo: null },
    ];

    const insights = [
        { icono: '🌙', impacto: 'Impacto Alta',  titulo: 'Priorizar Sueño Profundo',  desc: 'Tu HRV ha bajado un 15%. Se recomienda 9h de sueño y evitar estímulos nocturnos.', color: NARANJA },
        { icono: '⚡', impacto: 'Impacto Media', titulo: 'Deload de Piernas',          desc: 'Fatiga acumulada detectada. Reduce el volumen un 40% esta semana.', color: AZUL },
        { icono: '💧', impacto: 'Impacto Alta',  titulo: 'Aumentar Hidratación',       desc: 'Temperatura basal elevada. +500ml de agua en días de entrenamiento.', color: VERDE },
    ];

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
                setPerfil(resp.data);
                // Cargar preferencias alimentarias en el estado
                setTipoDieta(resp.data.tipo_dieta || 'omnivora');
                try {
                    const al = resp.data.alergias ? JSON.parse(resp.data.alergias) : [];
                    setAlergiasSeleccionadas(al);
                } catch { setAlergiasSeleccionadas([]); }
                try {
                    const ng = resp.data.alimentos_no_gusta ? JSON.parse(resp.data.alimentos_no_gusta) : [];
                    setNoGusta(ng.join(', '));
                } catch { setNoGusta(''); }
                try {
                    const fav = resp.data.alimentos_favoritos ? JSON.parse(resp.data.alimentos_favoritos) : [];
                    setFavoritos(fav.join(', '));
                } catch { setFavoritos(''); }
            }
        } catch (e) {
            console.log('Error perfil:', e.message);
        } finally {
            setCargando(false);
        }
    }

    // ── Subir foto de perfil ──────────────────────────────────────────────────
    async function cambiarFoto() {
        Alert.alert(
            'Foto de perfil',
            '¿Cómo quieres subir la foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: '📷 Cámara',   onPress: () => abrirFoto('camera')  },
                { text: '🖼️ Galería',  onPress: () => abrirFoto('gallery') },
            ]
        );
    }

    async function abrirFoto(fuente) {
        let resultado;
        const opciones = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] };

        if (fuente === 'camera') {
            const permiso = await ImagePicker.requestCameraPermissionsAsync();
            if (!permiso.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return; }
            resultado = await ImagePicker.launchCameraAsync(opciones);
        } else {
            const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permiso.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return; }
            resultado = await ImagePicker.launchImageLibraryAsync(opciones);
        }

        if (resultado.canceled || !resultado.assets?.[0]?.base64) return;

        setSubiendoFoto(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const asset = resultado.assets[0];
            // Construir base64 con prefijo de tipo
            const mimeType = asset.mimeType || 'image/jpeg';
            const base64Completo = `data:${mimeType};base64,${asset.base64}`;

            const resp = await axios.post(
                `${API_URL}/usuario/subir-foto.php`,
                { imagen_base64: base64Completo },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
            );

            if (resp.data?.foto_url) {
                setPerfil(prev => ({ ...prev, foto_perfil: resp.data.foto_url }));
                Alert.alert('✅', 'Foto actualizada correctamente.');
            }
        } catch (e) {
            const msg = e.response?.data?.error || 'No se pudo subir la foto.';
            Alert.alert('Error', msg);
        } finally {
            setSubiendoFoto(false);
        }
    }

    // ── Guardar preferencias alimentarias ────────────────────────────────────
    async function guardarAlimentacion() {
        setGuardandoAlim(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');

            const noGustaArr = noGusta.split(',').map(s => s.trim()).filter(Boolean);
            const favoritosArr = favoritos.split(',').map(s => s.trim()).filter(Boolean);

            await axios.post(
                `${API_URL}/usuario/perfil.php`,
                {
                    // Manda los mismos campos que ya acepta el endpoint
                    nombre:              perfil?.nombre,
                    altura_cm:           perfil?.altura_cm,
                    peso_objetivo:       perfil?.peso_objetivo,
                    grasa_objetivo:      perfil?.grasa_objetivo,
                    objetivo:            perfil?.objetivo,
                    dias_entrenamiento:  perfil?.dias_entrenamiento,
                    nivel:               perfil?.nivel,
                    tiene_ciclo:         perfil?.tiene_ciclo,
                    duracion_ciclo:      perfil?.duracion_ciclo,
                    patologias:          perfil?.patologias || [],
                    // Nuevos campos alimentarios
                    tipo_dieta:              tipoDieta,
                    alergias:                JSON.stringify(alergiasSeleccionadas),
                    alimentos_no_gusta:      JSON.stringify(noGustaArr),
                    alimentos_favoritos:     JSON.stringify(favoritosArr),
                },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );

            setPerfil(prev => ({
                ...prev,
                tipo_dieta:          tipoDieta,
                alergias:            JSON.stringify(alergiasSeleccionadas),
                alimentos_no_gusta:  JSON.stringify(noGustaArr),
                alimentos_favoritos: JSON.stringify(favoritosArr),
            }));

            setModalAlimentacion(false);
            Alert.alert('✅', 'Preferencias guardadas. La IA las usará al generar tu próxima dieta.');
        } catch (e) {
            Alert.alert('Error', 'No se pudieron guardar las preferencias.');
        } finally {
            setGuardandoAlim(false);
        }
    }

    function toggleAlergia(alergia) {
        const alergiaNorm = alergia.toLowerCase();
        setAlergiasSeleccionadas(prev =>
            prev.includes(alergiaNorm)
                ? prev.filter(a => a !== alergiaNorm)
                : [...prev, alergiaNorm]
        );
    }

    async function cerrarSesion() {
        Alert.alert(
            'Cerrar Sesión Biológica',
            '¿Estás seguro? Se eliminarán los datos de sesión del dispositivo.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar Sesión', style: 'destructive',
                    onPress: async () => {
                        setCerrando(true);
                        try {
                            await AsyncStorage.multiRemove([
                                'forja_token', 'forja_usuario_id',
                                'forja_completados', 'forja_rir', 'forja_comidas_completadas',
                            ]);
                            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo cerrar sesión.');
                        } finally {
                            setCerrando(false);
                        }
                    }
                }
            ]
        );
    }

    const nombre    = perfil?.nombre || 'Usuario';
    const usuarioId = perfil?.id ? `FORJA-${String(perfil.id).padStart(4, '0')}` : 'FORJA-????';
    const esMujer   = perfil?.sexo === 'mujer';
    const nivel     = perfil?.nivel || 'principiante';
    const nivelLabel = nivel === 'avanzado' ? 'BIO-ELITE' : nivel === 'intermedio' ? 'PRO' : 'STARTER';

    // Construir URL foto
    const fotoUrl = perfil?.foto_perfil
        ? (perfil.foto_perfil.startsWith('http') ? perfil.foto_perfil : `${API_URL}/../${perfil.foto_perfil}`)
        : null;

    // Resumen alimentario para mostrar en pantalla
    let alergiasResumen = '—';
    try {
        const al = perfil?.alergias ? JSON.parse(perfil.alergias) : [];
        alergiasResumen = al.length > 0 ? al.join(', ') : 'Ninguna';
    } catch { alergiasResumen = 'Ninguna'; }

    if (cargando) {
        return (
            <View style={estilos.cargandoBox}>
                <ActivityIndicator size="large" color={AZUL} />
            </View>
        );
    }

    return (
        <ScrollView style={estilos.contenedor} showsVerticalScrollIndicator={false}>

            <HeaderForja />

            {/* ── CARD USUARIO ── */}
            <View style={estilos.usuarioCard}>
                {/* Avatar con botón de editar */}
                <TouchableOpacity
                    style={estilos.avatarContenedor}
                    onPress={cambiarFoto}
                    disabled={subiendoFoto}
                >
                    {subiendoFoto ? (
                        <View style={estilos.avatarBox}>
                            <ActivityIndicator color="#fff" size="small" />
                        </View>
                    ) : fotoUrl ? (
                        <Image source={{ uri: fotoUrl }} style={estilos.avatarImg} />
                    ) : (
                        <View style={estilos.avatarBox}>
                            <Text style={estilos.avatarLetra}>{nombre.charAt(0)}</Text>
                        </View>
                    )}
                    {/* Badge cámara */}
                    <View style={estilos.camaraBadge}>
                        <Text style={estilos.camaraIcono}>📷</Text>
                    </View>
                    <View style={estilos.statusDot} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={estilos.usuarioNombre}>{nombre}</Text>
                    <View style={estilos.badgesRow}>
                        <View style={estilos.nivelBadge}>
                            <Text style={estilos.nivelTxt}>{nivelLabel}</Text>
                        </View>
                        <Text style={estilos.usuarioId}>ID: {usuarioId}</Text>
                    </View>
                </View>

                <TouchableOpacity style={estilos.flechaBox} onPress={() => setModalInfo(true)}>
                    <Text style={estilos.flecha}>›</Text>
                </TouchableOpacity>
            </View>

            {/* ── INSIGHTS DE IA ── */}
            <View style={estilos.seccionHeader}>
                <View style={estilos.seccionRow}>
                    <Text style={estilos.seccionIcono}>⚡</Text>
                    <Text style={estilos.seccionTitulo}>Insights de IA</Text>
                </View>
                <TouchableOpacity><Text style={estilos.linkAzul}>Ver historial</Text></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.insightsScroll}>
                {insights.map((ins, i) => (
                    <View key={i} style={[estilos.insightCard, { borderColor: ins.color + '30' }]}>
                        <View style={estilos.insightTop}>
                            <Text style={estilos.insightEmoji}>{ins.icono}</Text>
                            <View style={[estilos.impactoBadge, { backgroundColor: ins.color + '15' }]}>
                                <Text style={[estilos.impactoTxt, { color: ins.color }]}>{ins.impacto}</Text>
                            </View>
                        </View>
                        <Text style={estilos.insightTitulo}>{ins.titulo}</Text>
                        <Text style={estilos.insightDesc} numberOfLines={3}>{ins.desc}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* ── PREFERENCIAS ALIMENTARIAS ── */}
            <View style={estilos.seccionHeader}>
                <View style={estilos.seccionRow}>
                    <Text style={estilos.seccionIcono}>🥗</Text>
                    <Text style={estilos.seccionTitulo}>Preferencias Alimentarias</Text>
                </View>
                <TouchableOpacity onPress={() => setModalAlimentacion(true)}>
                    <Text style={estilos.linkAzul}>Editar</Text>
                </TouchableOpacity>
            </View>

            <View style={estilos.alimentacionCard}>
                <View style={estilos.alimentacionRow}>
                    <Text style={estilos.alimentacionLabel}>Tipo de dieta</Text>
                    <Text style={estilos.alimentacionVal}>
                        {TIPOS_DIETA.find(t => t.key === (perfil?.tipo_dieta || 'omnivora'))?.label || 'Omnívora'}
                    </Text>
                </View>
                <View style={[estilos.alimentacionRow, { borderTopWidth: 1, borderTopColor: BORDE }]}>
                    <Text style={estilos.alimentacionLabel}>Alergias</Text>
                    <Text style={estilos.alimentacionVal}>{alergiasResumen}</Text>
                </View>
                <View style={[estilos.alimentacionRow, { borderTopWidth: 1, borderTopColor: BORDE }]}>
                    <Text style={estilos.alimentacionLabel}>No me gusta</Text>
                    <Text style={estilos.alimentacionVal} numberOfLines={2}>
                        {(() => {
                            try {
                                const ng = perfil?.alimentos_no_gusta ? JSON.parse(perfil.alimentos_no_gusta) : [];
                                return ng.length > 0 ? ng.join(', ') : '—';
                            } catch { return '—'; }
                        })()}
                    </Text>
                </View>
                <View style={[estilos.alimentacionRow, { borderTopWidth: 1, borderTopColor: BORDE }]}>
                    <Text style={estilos.alimentacionLabel}>Favoritos</Text>
                    <Text style={estilos.alimentacionVal} numberOfLines={2}>
                        {(() => {
                            try {
                                const fav = perfil?.alimentos_favoritos ? JSON.parse(perfil.alimentos_favoritos) : [];
                                return fav.length > 0 ? fav.join(', ') : '—';
                            } catch { return '—'; }
                        })()}
                    </Text>
                </View>
            </View>

            {/* ── SINCRONIZACIÓN BIOMÉTRICA ── */}
            <View style={estilos.seccionHeader}>
                <View style={estilos.seccionRow}>
                    <Text style={estilos.seccionIcono}>📍</Text>
                    <Text style={estilos.seccionTitulo}>Sincronización Biométrica</Text>
                </View>
            </View>

            <View style={estilos.dispositivosCard}>
                {dispositivos.map((d, i) => (
                    <View key={i} style={[
                        estilos.dispositivoRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: BORDE, paddingTop: 16 }
                    ]}>
                        <View style={estilos.dispIconBox}>
                            <Text style={estilos.dispIcono}>{d.icono}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.dispNombre}>{d.nombre}</Text>
                            <View style={estilos.dispEstadoRow}>
                                <View style={[estilos.dispDot, { backgroundColor: d.conectado ? VERDE : ROJO }]} />
                                <Text style={[estilos.dispEstado, { color: d.conectado ? VERDE : ROJO }]}>{d.estado}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {d.tiempo && <Text style={estilos.dispTiempo}>{d.tiempo}</Text>}
                            <TouchableOpacity><Text style={estilos.linkAzul}>Ajustes</Text></TouchableOpacity>
                        </View>
                    </View>
                ))}
                <TouchableOpacity style={estilos.vincularBtn}>
                    <Text style={estilos.vincularIcono}>ⓘ</Text>
                    <Text style={estilos.vincularTxt}>Vincular nuevo dispositivo</Text>
                </TouchableOpacity>
            </View>

            {/* ── PRIVACIDAD ── */}
            <View style={estilos.privacidadCard}>
                <View style={estilos.privacidadHeader}>
                    <Text style={estilos.privacidadIcono}>🛡</Text>
                    <Text style={estilos.privacidadTituloTxt}>Privacidad y Biometría</Text>
                </View>
                <Text style={estilos.privacidadDesc}>Gestiona cómo FORJA procesa tus datos médicos.</Text>

                {esMujer && (
                    <View style={estilos.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.toggleTitulo}>Procesamiento de Ciclo Hormonal</Text>
                            <Text style={estilos.toggleDesc}>Permite a la IA ajustar planes según tu fase fisiológica actual.</Text>
                        </View>
                        <Switch value={cicloHormonal} onValueChange={setCicloHormonal} trackColor={{ false: BORDE, true: AZUL }} thumbColor="#fff" />
                    </View>
                )}
                <View style={[estilos.toggleRow, { borderTopWidth: 1, borderTopColor: BORDE }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.toggleTitulo}>Compartir con Apple Health</Text>
                        <Text style={estilos.toggleDesc}>Exportar entrenamientos y métricas de composición corporal.</Text>
                    </View>
                    <Switch value={appleHealth} onValueChange={setAppleHealth} trackColor={{ false: BORDE, true: AZUL }} thumbColor="#fff" />
                </View>
                <View style={[estilos.toggleRow, { borderTopWidth: 1, borderTopColor: BORDE }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={estilos.toggleTitulo}>Análisis de Marcadores en Sangre</Text>
                        <Text style={estilos.toggleDesc}>Carga y escaneo OCR de analíticas para optimización avanzada.</Text>
                    </View>
                    <Switch value={marcadoresSangre} onValueChange={setMarcadoresSangre} trackColor={{ false: BORDE, true: AZUL }} thumbColor="#fff" />
                </View>
            </View>

            {/* ── SOPORTE + CERRAR SESIÓN ── */}
            <TouchableOpacity style={estilos.soporteBtn}>
                <Text style={estilos.soporteIcono}>ⓘ</Text>
                <Text style={estilos.soporteTxt}>Soporte Científico-Médico</Text>
                <Text style={{ color: SUBTXT, fontSize: 20 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[estilos.cerrarBtn, cerrando && { opacity: 0.6 }]}
                onPress={cerrarSesion}
                disabled={cerrando}
            >
                {cerrando
                    ? <ActivityIndicator color={ROJO} size="small" />
                    : <><Text style={estilos.cerrarIcono}>↪</Text><Text style={estilos.cerrarTxt}>Cerrar Sesión Biológica</Text></>
                }
            </TouchableOpacity>

            <Text style={estilos.versionTxt}>FORJA v2.4.1 — Desarrollado bajo protocolo de alto rendimiento deportivo.</Text>
            <View style={{ height: 100 }} />

            {/* ═══ MODAL INFO PERFIL ═══════════════════════════════════════ */}
            <Modal visible={modalInfo} transparent animationType="slide">
                <TouchableOpacity style={estilos.modalOverlay} activeOpacity={1} onPress={() => setModalInfo(false)}>
                    <View style={estilos.bottomSheet}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>Tu perfil</Text>
                        <View style={estilos.infoGrid}>
                            {[
                                { label: 'Nombre',              val: perfil?.nombre || '—' },
                                { label: 'Email',               val: perfil?.email  || '—' },
                                { label: 'Sexo',                val: perfil?.sexo   || '—' },
                                { label: 'Altura',              val: perfil?.altura_cm ? `${perfil.altura_cm} cm` : '—' },
                                { label: 'Objetivo',            val: perfil?.objetivo?.replace('_', ' ') || '—' },
                                { label: 'Nivel',               val: perfil?.nivel  || '—' },
                                { label: 'Días de entreno/sem', val: perfil?.dias_entrenamiento ? `${perfil.dias_entrenamiento} días` : '—' },
                                { label: 'Patologías',          val: perfil?.patologias?.length > 0 ? perfil.patologias.join(', ') : 'Ninguna' },
                            ].map((item, i) => (
                                <View key={i} style={estilos.infoItem}>
                                    <Text style={estilos.infoLabel}>{item.label}</Text>
                                    <Text style={estilos.infoVal} numberOfLines={2}>{item.val}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={estilos.modalBtnBorde}
                            onPress={() => { setModalInfo(false); navigation.navigate('CompletarPerfil'); }}
                        >
                            <Text style={estilos.modalBtnBordeTxt}>Editar datos completos →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={estilos.modalBtnGris} onPress={() => setModalInfo(false)}>
                            <Text style={estilos.modalBtnGrisTxt}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ═══ MODAL PREFERENCIAS ALIMENTARIAS ═══════════════════════ */}
            <Modal visible={modalAlimentacion} transparent animationType="slide">
                <View style={estilos.modalOverlay}>
                    <ScrollView style={estilos.bottomSheetScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={estilos.sheetHandle} />
                        <Text style={estilos.sheetTitulo}>🥗 Preferencias Alimentarias</Text>
                        <Text style={estilos.sheetDesc}>La IA usará estos datos para generar tu plan de dieta personalizado.</Text>

                        {/* Tipo de dieta */}
                        <Text style={estilos.inputLabel}>Tipo de dieta</Text>
                        <View style={estilos.chipRow}>
                            {TIPOS_DIETA.map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[estilos.chip, tipoDieta === t.key && estilos.chipActivo]}
                                    onPress={() => setTipoDieta(t.key)}
                                >
                                    <Text style={[estilos.chipTxt, tipoDieta === t.key && estilos.chipTxtActivo]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Alergias */}
                        <Text style={estilos.inputLabel}>Alergias e intolerancias</Text>
                        <View style={estilos.chipRow}>
                            {ALERGIAS_COMUNES.map(a => {
                                const aNorm   = a.toLowerCase();
                                const activo  = alergiasSeleccionadas.includes(aNorm);
                                return (
                                    <TouchableOpacity
                                        key={a}
                                        style={[estilos.chip, activo && estilos.chipActivoRojo]}
                                        onPress={() => toggleAlergia(a)}
                                    >
                                        <Text style={[estilos.chipTxt, activo && estilos.chipTxtRojo]}>{a}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* No me gusta */}
                        <Text style={estilos.inputLabel}>Alimentos que NO me gustan</Text>
                        <Text style={estilos.inputHint}>Separados por coma: hígado, brócoli, alcachofas...</Text>
                        <TextInput
                            style={estilos.inputCampo}
                            value={noGusta}
                            onChangeText={setNoGusta}
                            placeholder="ej: hígado, coliflor, espinacas..."
                            placeholderTextColor={SUBTXT}
                            multiline
                        />

                        {/* Favoritos */}
                        <Text style={estilos.inputLabel}>Alimentos favoritos</Text>
                        <Text style={estilos.inputHint}>La IA los priorizará en tu plan nutricional.</Text>
                        <TextInput
                            style={estilos.inputCampo}
                            value={favoritos}
                            onChangeText={setFavoritos}
                            placeholder="ej: pollo, arroz, huevos, avena..."
                            placeholderTextColor={SUBTXT}
                            multiline
                        />

                        <TouchableOpacity
                            style={[estilos.modalBtn, guardandoAlim && { opacity: 0.6 }]}
                            onPress={guardarAlimentacion}
                            disabled={guardandoAlim}
                        >
                            {guardandoAlim
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={estilos.modalBtnTxt}>Guardar preferencias</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity style={estilos.modalBtnGris} onPress={() => setModalAlimentacion(false)}>
                            <Text style={estilos.modalBtnGrisTxt}>Cancelar</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
    contenedor:  { flex: 1, backgroundColor: FONDO },
    cargandoBox: { flex: 1, backgroundColor: FONDO, justifyContent: 'center', alignItems: 'center' },

    header: { paddingTop: 55, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDE },
    headerTitulo: { color: TEXTO, fontSize: 20, fontWeight: '700' },

    // Usuario
    usuarioCard: { margin: 16, backgroundColor: CARD, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: BORDE },
    avatarContenedor: { position: 'relative' },
    avatarImg:  { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: AZUL },
    avatarBox:  { width: 64, height: 64, borderRadius: 32, backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: AZUL + '80' },
    avatarLetra:{ color: '#fff', fontSize: 26, fontWeight: '800' },
    camaraBadge:{ position: 'absolute', bottom: 0, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: CARD2, borderWidth: 1.5, borderColor: BORDE, justifyContent: 'center', alignItems: 'center' },
    camaraIcono:{ fontSize: 11 },
    statusDot:  { position: 'absolute', top: 2, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: VERDE, borderWidth: 2, borderColor: FONDO },
    usuarioNombre: { color: TEXTO, fontSize: 19, fontWeight: '800', marginBottom: 6 },
    badgesRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    nivelBadge:    { backgroundColor: AZUL + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: AZUL + '50' },
    nivelTxt:      { color: AZUL, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    usuarioId:     { color: SUBTXT, fontSize: 12 },
    flechaBox:     { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    flecha:        { color: SUBTXT, fontSize: 18 },

    // Secciones
    seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
    seccionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seccionIcono:  { fontSize: 18 },
    seccionTitulo: { color: TEXTO, fontSize: 16, fontWeight: '800' },
    linkAzul:      { color: AZUL, fontSize: 13, fontWeight: '700' },

    // Insights
    insightsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4, marginBottom: 20 },
    insightCard:    { width: 200, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1 },
    insightTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    insightEmoji:   { fontSize: 22 },
    impactoBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    impactoTxt:     { fontSize: 10, fontWeight: '700' },
    insightTitulo:  { color: TEXTO, fontSize: 14, fontWeight: '700', marginBottom: 6 },
    insightDesc:    { color: SUBTXT, fontSize: 12, lineHeight: 18 },

    // Preferencias alimentarias
    alimentacionCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDE, overflow: 'hidden' },
    alimentacionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, gap: 12 },
    alimentacionLabel:{ color: SUBTXT, fontSize: 13, fontWeight: '600', flex: 1 },
    alimentacionVal:  { color: TEXTO, fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },

    // Dispositivos
    dispositivosCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    dispositivoRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16 },
    dispIconBox:      { width: 44, height: 44, borderRadius: 12, backgroundColor: CARD2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDE },
    dispIcono:        { fontSize: 22 },
    dispNombre:       { color: TEXTO, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    dispEstadoRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dispDot:          { width: 6, height: 6, borderRadius: 3 },
    dispEstado:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    dispTiempo:       { color: SUBTXT, fontSize: 11 },
    vincularBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: BORDE, borderWidth: 1, borderColor: BORDE + '80', borderRadius: 12, borderStyle: 'dashed' },
    vincularIcono:    { color: SUBTXT, fontSize: 16 },
    vincularTxt:      { color: SUBTXT, fontSize: 14, fontWeight: '600' },

    // Privacidad
    privacidadCard:     { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDE },
    privacidadHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    privacidadIcono:    { fontSize: 18 },
    privacidadTituloTxt:{ color: TEXTO, fontSize: 15, fontWeight: '800' },
    privacidadDesc:     { color: SUBTXT, fontSize: 12, marginBottom: 16 },
    toggleRow:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    toggleTitulo:       { color: TEXTO, fontSize: 14, fontWeight: '600', marginBottom: 3 },
    toggleDesc:         { color: SUBTXT, fontSize: 12, lineHeight: 17 },

    soporteBtn: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: BORDE },
    soporteIcono:{ color: SUBTXT, fontSize: 18 },
    soporteTxt:  { color: TEXTO, fontSize: 15, fontWeight: '600', flex: 1 },
    cerrarBtn:   { marginHorizontal: 16, marginBottom: 16, backgroundColor: ROJO + '15', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: ROJO + '40' },
    cerrarIcono: { color: ROJO, fontSize: 18 },
    cerrarTxt:   { color: ROJO, fontSize: 15, fontWeight: '700' },
    versionTxt:  { color: '#2a2a2a', fontSize: 11, textAlign: 'center', paddingHorizontal: 20, marginBottom: 8 },

    // Modales
    modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    bottomSheet:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: BORDE },
    bottomSheetScroll:{ backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: BORDE },
    sheetHandle:  { width: 40, height: 4, backgroundColor: BORDE, borderRadius: 2, alignSelf: 'center', marginBottom: 16, marginTop: 12 },
    sheetTitulo:  { color: TEXTO, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    sheetDesc:    { color: SUBTXT, fontSize: 13, marginBottom: 20, lineHeight: 20 },
    inputLabel:   { color: SUBTXT, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
    inputHint:    { color: '#374151', fontSize: 11, marginBottom: 8, marginTop: -4 },
    inputCampo:   { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE, borderRadius: 10, padding: 12, color: TEXTO, fontSize: 14, marginBottom: 4, minHeight: 52 },
    chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip:         { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDE },
    chipActivo:   { backgroundColor: AZUL + '20', borderColor: AZUL },
    chipActivoRojo:{ backgroundColor: ROJO + '15', borderColor: ROJO + '60' },
    chipTxt:      { color: SUBTXT, fontSize: 13, fontWeight: '600' },
    chipTxtActivo:{ color: AZUL },
    chipTxtRojo:  { color: ROJO },
    infoGrid:     { gap: 10, marginBottom: 20 },
    infoItem:     { backgroundColor: CARD2, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: BORDE },
    infoLabel:    { color: SUBTXT, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
    infoVal:      { color: TEXTO, fontSize: 14, fontWeight: '600' },
    modalBtn:         { backgroundColor: AZUL, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
    modalBtnTxt:      { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalBtnBorde:    { borderWidth: 1, borderColor: AZUL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    modalBtnBordeTxt: { color: AZUL, fontSize: 15, fontWeight: '700' },
    modalBtnGris:     { paddingVertical: 14, alignItems: 'center' },
    modalBtnGrisTxt:  { color: SUBTXT, fontSize: 14 },
});