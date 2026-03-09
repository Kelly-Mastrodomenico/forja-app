import { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, Animated
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function RegisterScreen({ navigation }) {
    const [nombre, setNombre]           = useState('');
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [sexo, setSexo]               = useState(null); // 'hombre' | 'mujer'
    const [fechaCiclo, setFechaCiclo]   = useState('');
    const [cargando, setCargando]       = useState(false);

    async function registrar() {
        if (!nombre.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Campos requeridos', 'Completa nombre, correo y contraseña.');
            return;
        }
        if (!sexo) {
            Alert.alert('Selector requerido', 'Selecciona tu biología para personalizar tu plan.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Contraseña débil', 'Mínimo 6 caracteres.');
            return;
        }

        setCargando(true);
        try {
            const body = {
                nombre:              nombre.trim(),
                email:               email.trim().toLowerCase(),
                password,
                sexo,
                tiene_ciclo:         sexo === 'mujer',
                fecha_ultimo_ciclo:  (sexo === 'mujer' && fechaCiclo.trim()) ? fechaCiclo.trim() : null,
            };

            const resp = await axios.post(`${API_URL}/auth/registro.php`, body);

            if (resp.data?.token) {
                // Guardar token y navegar al perfil para completar datos
                const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                await AsyncStorage.setItem('forja_token', resp.data.token);
                await AsyncStorage.setItem('forja_usuario_id', String(resp.data.usuario_id));
                navigation.replace('CompletarPerfil');
            } else {
                Alert.alert('Error', resp.data?.error || 'No se pudo registrar.');
            }
        } catch (e) {
            const msg = e.response?.data?.error || 'Error de conexión. Verifica tu red.';
            Alert.alert('Error', msg);
        } finally {
            setCargando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={estilos.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={estilos.contenedor}
                contentContainerStyle={estilos.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── LOGO ── */}
                <View style={estilos.logoContenedor}>
                    <View style={estilos.logoBox}>
                        <Text style={estilos.logoIcono}>⚡</Text>
                    </View>
                </View>

                {/* ── TÍTULO ── */}
                <Text style={estilos.titulo}>
                    Bienvenido a <Text style={estilos.tituloAcento}>FORJA</Text>
                </Text>
                <Text style={estilos.subtitulo}>
                    Optimización biológica basada en{'\n'}ciencia de alto rendimiento.
                </Text>

                {/* ── CAMPOS ── */}
                <View style={estilos.camposContenedor}>

                    <Text style={estilos.etiqueta}>NOMBRE COMPLETO</Text>
                    <View style={estilos.inputContenedor}>
                        <Text style={estilos.inputIcono}>👤</Text>
                        <TextInput
                            style={estilos.input}
                            placeholder="Tu nombre"
                            placeholderTextColor="#4a5568"
                            value={nombre}
                            onChangeText={setNombre}
                            autoCapitalize="words"
                        />
                    </View>

                    <Text style={estilos.etiqueta}>CORREO ELECTRÓNICO</Text>
                    <View style={estilos.inputContenedor}>
                        <Text style={estilos.inputIcono}>✉️</Text>
                        <TextInput
                            style={estilos.input}
                            placeholder="ejemplo@forja.bio"
                            placeholderTextColor="#4a5568"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <Text style={estilos.etiqueta}>CONTRASEÑA SEGURA</Text>
                    <View style={estilos.inputContenedor}>
                        <Text style={estilos.inputIcono}>🔒</Text>
                        <TextInput
                            style={estilos.input}
                            placeholder="••••••••"
                            placeholderTextColor="#4a5568"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                </View>

                {/* ── SELECTOR DE BIOLOGÍA ── */}
                <View style={estilos.selectorHeader}>
                    <Text style={estilos.selectorTitulo}>SELECTOR DE BIOLOGÍA CRÍTICO</Text>
                    <View style={estilos.requeridoBadge}>
                        <Text style={estilos.requeridoTxt}>REQUERIDO</Text>
                    </View>
                </View>

                <View style={estilos.selectorGrid}>
                    {/* HOMBRE */}
                    <TouchableOpacity
                        style={[estilos.selectorCard, sexo === 'hombre' && estilos.selectorCardActivo]}
                        onPress={() => setSexo('hombre')}
                        activeOpacity={0.85}
                    >
                        {sexo === 'hombre' && (
                            <View style={estilos.checkmark}>
                                <Text style={estilos.checkmarkTxt}>✓</Text>
                            </View>
                        )}
                        <View style={[estilos.selectorIconBox, sexo === 'hombre' && estilos.selectorIconBoxActivo]}>
                            <Text style={estilos.selectorIcono}>⚡</Text>
                        </View>
                        <Text style={[estilos.selectorNombre, sexo === 'hombre' && estilos.selectorNombreActivo]}>
                            Hombre
                        </Text>
                        <Text style={estilos.selectorSub}>Metabolismo Estable</Text>
                    </TouchableOpacity>

                    {/* MUJER */}
                    <TouchableOpacity
                        style={[estilos.selectorCard, sexo === 'mujer' && estilos.selectorCardActivoMujer]}
                        onPress={() => setSexo('mujer')}
                        activeOpacity={0.85}
                    >
                        {sexo === 'mujer' && (
                            <View style={[estilos.checkmark, { backgroundColor: '#f472b6' }]}>
                                <Text style={estilos.checkmarkTxt}>✓</Text>
                            </View>
                        )}
                        <View style={[estilos.selectorIconBox, sexo === 'mujer' && estilos.selectorIconBoxActivoMujer]}>
                            <Text style={estilos.selectorIcono}>⚡</Text>
                        </View>
                        <Text style={[estilos.selectorNombre, sexo === 'mujer' && estilos.selectorNombreActivoMujer]}>
                            Mujer
                        </Text>
                        <Text style={estilos.selectorSub}>Ciclo Hormonal</Text>
                    </TouchableOpacity>
                </View>

                {/* ── CAMPO CICLO (solo mujer) ── */}
                {sexo === 'mujer' && (
                    <View style={estilos.cicloContenedor}>
                        <View style={estilos.cicloHeader}>
                            <Text style={estilos.cicloIcono}>🌙</Text>
                            <Text style={estilos.cicloTitulo}>Optimización Hormonal</Text>
                        </View>
                        <Text style={estilos.cicloDesc}>
                            Fecha de inicio de tu último ciclo (opcional). FORJA ajustará tu nutrición e intensidad según tu fase.
                        </Text>
                        <View style={[estilos.inputContenedor, estilos.cicloInput]}>
                            <Text style={estilos.inputIcono}>📅</Text>
                            <TextInput
                                style={estilos.input}
                                placeholder="AAAA-MM-DD  (ej: 2025-01-15)"
                                placeholderTextColor="#4a5568"
                                value={fechaCiclo}
                                onChangeText={setFechaCiclo}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                )}

                {/* ── BOTÓN PRINCIPAL ── */}
                <TouchableOpacity
                    style={[estilos.botonPrincipal, cargando && estilos.botonDesactivado]}
                    onPress={registrar}
                    disabled={cargando}
                    activeOpacity={0.9}
                >
                    {cargando
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Text style={estilos.botonTxt}>Configurar Perfil Biológico</Text>
                            <Text style={estilos.botonFlecha}>→</Text>
                          </>
                    }
                </TouchableOpacity>

                {/* ── LINK LOGIN ── */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    style={estilos.loginLink}
                >
                    <Text style={estilos.loginTxt}>
                        ¿Ya tienes cuenta? <Text style={estilos.loginAcento}>Inicia Sesión</Text>
                    </Text>
                </TouchableOpacity>

                {/* ── SEGURIDAD ── */}
                <View style={estilos.seguridadRow}>
                    <Text style={estilos.seguridadIcono}>🔒</Text>
                    <Text style={estilos.seguridadTxt}>DATOS ENCRIPTADOS BAJO PROTOCOLOS BIOMÉDICOS</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const AZUL    = '#3b82f6';
const ROSA    = '#f472b6';
const FONDO   = '#000000';
const CARD    = '#111111';
const CARD2   = '#1a1a1a';
const BORDE   = '#2a2a2a';
const TEXTO   = '#ffffff';
const SUBTXT  = '#6b7280';

const estilos = StyleSheet.create({
    flex:       { flex: 1, backgroundColor: FONDO },
    contenedor: { flex: 1, backgroundColor: FONDO },
    scroll:     { paddingHorizontal: 24, paddingTop: 60 },

    // Logo
    logoContenedor: { alignItems: 'center', marginBottom: 20 },
    logoBox: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: '#1e1e1e',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: BORDE,
        shadowColor: AZUL, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    },
    logoIcono: { fontSize: 32 },

    // Título
    titulo: {
        color: TEXTO, fontSize: 28, fontWeight: '800',
        textAlign: 'center', marginBottom: 8,
    },
    tituloAcento: { color: AZUL },
    subtitulo: {
        color: SUBTXT, fontSize: 14, textAlign: 'center',
        lineHeight: 22, marginBottom: 32,
    },

    // Campos
    camposContenedor: { marginBottom: 28 },
    etiqueta: {
        color: SUBTXT, fontSize: 11, fontWeight: '700',
        letterSpacing: 1.2, marginBottom: 8, marginTop: 16,
    },
    inputContenedor: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: CARD, borderRadius: 12,
        borderWidth: 1, borderColor: BORDE,
        paddingHorizontal: 14, paddingVertical: 14,
    },
    inputIcono: { fontSize: 16, marginRight: 10 },
    input: {
        flex: 1, color: TEXTO, fontSize: 15,
    },

    // Selector biología
    selectorHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
    },
    selectorTitulo: {
        color: AZUL, fontSize: 11, fontWeight: '700', letterSpacing: 1,
    },
    requeridoBadge: {
        backgroundColor: CARD2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        borderWidth: 1, borderColor: BORDE,
    },
    requeridoTxt: { color: SUBTXT, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

    selectorGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },

    selectorCard: {
        flex: 1, backgroundColor: CARD,
        borderRadius: 16, borderWidth: 1.5, borderColor: BORDE,
        paddingVertical: 22, paddingHorizontal: 16,
        alignItems: 'center', position: 'relative',
    },
    selectorCardActivo: {
        borderColor: AZUL, backgroundColor: '#0f1929',
        shadowColor: AZUL, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },
    selectorCardActivoMujer: {
        borderColor: ROSA, backgroundColor: '#1f0f1a',
        shadowColor: ROSA, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },

    checkmark: {
        position: 'absolute', top: 10, right: 10,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: AZUL, justifyContent: 'center', alignItems: 'center',
    },
    checkmarkTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },

    selectorIconBox: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: CARD2,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12, borderWidth: 1, borderColor: BORDE,
    },
    selectorIconBoxActivo:      { backgroundColor: '#1e3a5f', borderColor: AZUL },
    selectorIconBoxActivoMujer: { backgroundColor: '#3d1a2e', borderColor: ROSA },
    selectorIcono: { fontSize: 24 },

    selectorNombre: {
        color: TEXTO, fontSize: 17, fontWeight: '700', marginBottom: 4,
    },
    selectorNombreActivo:      { color: AZUL },
    selectorNombreActivoMujer: { color: ROSA },
    selectorSub: { color: SUBTXT, fontSize: 12, textAlign: 'center' },

    // Campo ciclo menstrual
    cicloContenedor: {
        backgroundColor: '#1a0f1a', borderRadius: 14,
        borderWidth: 1, borderColor: '#4a1a3a',
        padding: 16, marginBottom: 24,
    },
    cicloHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cicloIcono:  { fontSize: 16, marginRight: 8 },
    cicloTitulo: { color: ROSA, fontSize: 13, fontWeight: '700' },
    cicloDesc: {
        color: SUBTXT, fontSize: 12, lineHeight: 18, marginBottom: 12,
    },
    cicloInput: { backgroundColor: '#0f0a0f', borderColor: '#4a1a3a' },

    // Botón principal
    botonPrincipal: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        backgroundColor: AZUL, borderRadius: 14,
        paddingVertical: 17, marginBottom: 16,
        shadowColor: AZUL, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    botonDesactivado: { opacity: 0.6 },
    botonTxt:   { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
    botonFlecha:{ color: '#fff', fontSize: 18, fontWeight: '300' },

    // Links
    loginLink:  { alignItems: 'center', marginBottom: 16 },
    loginTxt:   { color: SUBTXT, fontSize: 14 },
    loginAcento:{ color: TEXTO, fontWeight: '700', textDecorationLine: 'underline' },

    // Seguridad
    seguridadRow: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    seguridadIcono: { fontSize: 10 },
    seguridadTxt: {
        color: '#374151', fontSize: 9, fontWeight: '600', letterSpacing: 0.8,
    },
});