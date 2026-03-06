import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function RegistroScreen({ navigation }) {
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(false);

    // Paso 1 — cuenta
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');

    // Paso 2 — datos físicos
    const [sexo, setSexo] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [alturaCm, setAlturaCm] = useState('');
    const [pesoActual, setPesoActual] = useState('');
    const [nivel, setNivel] = useState('');

    // Paso 3 — objetivo y entrenamiento
    const [objetivo, setObjetivo] = useState('');
    const [diasEntrenamiento, setDiasEntrenamiento] = useState('');
    const [tieneCiclo, setTieneCiclo] = useState(false);
    const [duracionCiclo, setDuracionCiclo] = useState('28');
    const [patologias, setPatologias] = useState(['ninguna']);

    function togglePatologia(pat) {
        if (pat === 'ninguna') {
            setPatologias(['ninguna']);
            return;
        }
        let nuevas = patologias.filter(p => p !== 'ninguna');
        if (nuevas.includes(pat)) {
            nuevas = nuevas.filter(p => p !== pat);
        } else {
            nuevas.push(pat);
        }
        setPatologias(nuevas.length === 0 ? ['ninguna'] : nuevas);
    }

    function validarPaso1() {
        if (!nombre.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Error', 'Completa todos los campos');
            return false;
        }
        if (!email.includes('@')) {
            Alert.alert('Error', 'Email no válido');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
        if (password !== confirmarPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return false;
        }
        return true;
    }

    function validarPaso2() {
        if (!sexo || !fechaNacimiento.trim() || !alturaCm.trim() || !nivel) {
            Alert.alert('Error', 'Completa todos los campos');
            return false;
        }
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaNacimiento)) {
            Alert.alert('Error', 'Fecha en formato AAAA-MM-DD\nEjemplo: 1995-03-15');
            return false;
        }
        return true;
    }

    function validarPaso3() {
        if (!objetivo || !diasEntrenamiento.trim()) {
            Alert.alert('Error', 'Selecciona tu objetivo y días de entrenamiento');
            return false;
        }
        return true;
    }

    async function handleRegistro() {
        if (!validarPaso3()) return;

        setCargando(true);
        try {
            const respuesta = await axios.post(`${API_URL}/auth/registro.php`, {
                nombre: nombre.trim(),
                email: email.trim().toLowerCase(),
                password: password,
                sexo: sexo,
                fecha_nacimiento: fechaNacimiento,
                altura_cm: parseFloat(alturaCm),
                peso_actual: pesoActual ? parseFloat(pesoActual) : null,
                objetivo: objetivo,
                dias_entrenamiento: parseInt(diasEntrenamiento),
                nivel: nivel,
                tiene_ciclo: tieneCiclo,
                duracion_ciclo: parseInt(duracionCiclo),
                patologias: patologias
            });

            await AsyncStorage.setItem('forja_usuario', JSON.stringify({
                id: respuesta.data.usuario_id,
                nombre: nombre.trim(),
                email: email.trim().toLowerCase(),
                objetivo: objetivo,
                nivel: nivel,
                token: respuesta.data.token
            }));
            await AsyncStorage.setItem('forja_token', respuesta.data.token);

            navigation.replace('Home', {
                usuario: {
                    id: respuesta.data.usuario_id,
                    nombre: nombre.trim(),
                    objetivo: objetivo,
                    nivel: nivel,
                    token: respuesta.data.token
                }
            });

        } catch (error) {
            const mensaje = error.response?.data?.error || 'Error al registrar. Intenta de nuevo.';
            Alert.alert('Error', mensaje);
        } finally {
            setCargando(false);
        }
    }

    // Componentes de selección
    function Opcion({ valor, seleccionado, onPress, texto }) {
        return (
            <TouchableOpacity
                style={[estilos.opcion, seleccionado && estilos.opcionActiva]}
                onPress={onPress}
            >
                <Text style={[estilos.opcionTexto, seleccionado && estilos.opcionTextoActivo]}>
                    {texto}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <KeyboardAvoidingView
            style={estilos.contenedor}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>

                {/* Encabezado */}
                <Text style={estilos.logo}>FORJA</Text>
                <Text style={estilos.titulo}>Crear cuenta</Text>

                {/* Indicador de pasos */}
                <View style={estilos.pasos}>
                    {[1, 2, 3].map(n => (
                        <View key={n} style={[estilos.paso, paso >= n && estilos.pasoActivo]} />
                    ))}
                </View>

                {/* ── PASO 1 — Cuenta ── */}
                {paso === 1 && (
                    <View>
                        <Text style={estilos.subtitulo}>Datos de acceso</Text>

                        <Text style={estilos.etiqueta}>Nombre completo</Text>
                        <TextInput style={estilos.input} placeholder="Kelly Rodriguez"
                            placeholderTextColor="#555" value={nombre} onChangeText={setNombre} />

                        <Text style={estilos.etiqueta}>Email</Text>
                        <TextInput style={estilos.input} placeholder="tu@email.com"
                            placeholderTextColor="#555" keyboardType="email-address"
                            autoCapitalize="none" value={email} onChangeText={setEmail} />

                        <Text style={estilos.etiqueta}>Contraseña</Text>
                        <TextInput style={estilos.input} placeholder="Mínimo 6 caracteres"
                            placeholderTextColor="#555" secureTextEntry
                            value={password} onChangeText={setPassword} />

                        <Text style={estilos.etiqueta}>Confirmar contraseña</Text>
                        <TextInput style={estilos.input} placeholder="Repite la contraseña"
                            placeholderTextColor="#555" secureTextEntry
                            value={confirmarPassword} onChangeText={setConfirmarPassword} />

                        <TouchableOpacity style={estilos.boton}
                            onPress={() => { if (validarPaso1()) setPaso(2); }}>
                            <Text style={estilos.botonTexto}>Siguiente →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── PASO 2 — Datos físicos ── */}
                {paso === 2 && (
                    <View>
                        <Text style={estilos.subtitulo}>Datos físicos</Text>

                        <Text style={estilos.etiqueta}>Sexo</Text>
                        <View style={estilos.fila}>
                            {['hombre', 'mujer', 'otro'].map(s => (
                                <Opcion key={s} valor={s} seleccionado={sexo === s}
                                    onPress={() => setSexo(s)}
                                    texto={s.charAt(0).toUpperCase() + s.slice(1)} />
                            ))}
                        </View>

                        <Text style={estilos.etiqueta}>Fecha de nacimiento (AAAA-MM-DD)</Text>
                        <TextInput style={estilos.input} placeholder="1995-03-15"
                            placeholderTextColor="#555" value={fechaNacimiento}
                            onChangeText={setFechaNacimiento} />

                        <Text style={estilos.etiqueta}>Altura (cm)</Text>
                        <TextInput style={estilos.input} placeholder="160"
                            placeholderTextColor="#555" keyboardType="numeric"
                            value={alturaCm} onChangeText={setAlturaCm} />

                        <Text style={estilos.etiqueta}>Peso actual (kg) — opcional</Text>
                        <TextInput style={estilos.input} placeholder="54"
                            placeholderTextColor="#555" keyboardType="numeric"
                            value={pesoActual} onChangeText={setPesoActual} />

                        <Text style={estilos.etiqueta}>Nivel de experiencia</Text>
                        <View style={estilos.fila}>
                            {['principiante', 'intermedio', 'avanzado'].map(n => (
                                <Opcion key={n} valor={n} seleccionado={nivel === n}
                                    onPress={() => setNivel(n)}
                                    texto={n.charAt(0).toUpperCase() + n.slice(1)} />
                            ))}
                        </View>

                        <View style={estilos.filaBotones}>
                            <TouchableOpacity style={estilos.botonSecundario} onPress={() => setPaso(1)}>
                                <Text style={estilos.botonSecundarioTexto}>← Atrás</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={estilos.boton}
                                onPress={() => { if (validarPaso2()) setPaso(3); }}>
                                <Text style={estilos.botonTexto}>Siguiente →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── PASO 3 — Objetivo ── */}
                {paso === 3 && (
                    <View>
                        <Text style={estilos.subtitulo}>Objetivo y salud</Text>

                        <Text style={estilos.etiqueta}>¿Cuál es tu objetivo?</Text>
                        {[
                            { valor: 'perder_grasa', texto: '🔥 Perder grasa' },
                            { valor: 'ganar_musculo', texto: '💪 Ganar músculo' },
                            { valor: 'recomposicion', texto: '⚡ Recomposición corporal' },
                            { valor: 'mantenimiento', texto: '✅ Mantenimiento' },
                        ].map(op => (
                            <Opcion key={op.valor} valor={op.valor}
                                seleccionado={objetivo === op.valor}
                                onPress={() => setObjetivo(op.valor)}
                                texto={op.texto} />
                        ))}

                        <Text style={estilos.etiqueta}>Días de entrenamiento por semana</Text>
                        <View style={estilos.fila}>
                            {['2', '3', '4', '5', '6'].map(d => (
                                <Opcion key={d} valor={d} seleccionado={diasEntrenamiento === d}
                                    onPress={() => setDiasEntrenamiento(d)} texto={d} />
                            ))}
                        </View>

                        <Text style={estilos.etiqueta}>¿Tienes ciclo menstrual?</Text>
                        <View style={estilos.fila}>
                            <Opcion valor={true} seleccionado={tieneCiclo === true}
                                onPress={() => setTieneCiclo(true)} texto="Sí" />
                            <Opcion valor={false} seleccionado={tieneCiclo === false}
                                onPress={() => setTieneCiclo(false)} texto="No" />
                        </View>

                        {tieneCiclo && (
                            <>
                                <Text style={estilos.etiqueta}>Duración del ciclo (días)</Text>
                                <TextInput style={estilos.input} placeholder="28"
                                    placeholderTextColor="#555" keyboardType="numeric"
                                    value={duracionCiclo} onChangeText={setDuracionCiclo} />
                            </>
                        )}

                        <Text style={estilos.etiqueta}>¿Tienes alguna condición de salud?</Text>
                        {[
                            { valor: 'ninguna', texto: 'Ninguna' },
                            { valor: 'sop', texto: 'SOP' },
                            { valor: 'hipotiroidismo', texto: 'Hipotiroidismo' },
                            { valor: 'resistencia_insulina', texto: 'Resistencia a la insulina' },
                            { valor: 'endometriosis', texto: 'Endometriosis' },
                            { valor: 'diabetes_tipo2', texto: 'Diabetes tipo 2' },
                        ].map(op => (
                            <Opcion key={op.valor} valor={op.valor}
                                seleccionado={patologias.includes(op.valor)}
                                onPress={() => togglePatologia(op.valor)}
                                texto={op.texto} />
                        ))}

                        <View style={estilos.filaBotones}>
                            <TouchableOpacity style={estilos.botonSecundario} onPress={() => setPaso(2)}>
                                <Text style={estilos.botonSecundarioTexto}>← Atrás</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[estilos.boton, cargando && estilos.botonDesactivado]}
                                onPress={handleRegistro} disabled={cargando}>
                                {cargando
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={estilos.botonTexto}>Crear cuenta ✓</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Link a login */}
                <TouchableOpacity style={estilos.linkLogin} onPress={() => navigation.navigate('Login')}>
                    <Text style={estilos.linkTexto}>
                        ¿Ya tienes cuenta? <Text style={estilos.linkDestacado}>Inicia sesión</Text>
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    scroll: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
    logo: { fontSize: 36, fontWeight: '900', color: '#2563eb', letterSpacing: 6, textAlign: 'center' },
    titulo: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 4, letterSpacing: 2 },
pasos: { flexDirection: 'row', justifyContent: 'center', marginVertical: 24 },
    paso: { width: 60, height: 4, borderRadius: 2, backgroundColor: '#1a1a2e' },
    pasoActivo: { backgroundColor: '#2563eb' },
    subtitulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 20 },
    etiqueta: { color: '#aaa', fontSize: 12, letterSpacing: 1, marginTop: 16, marginBottom: 8 },
    input: {
        backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2563eb30',
        borderRadius: 12, padding: 14, color: '#fff', fontSize: 15
    },
    fila: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
    opcion: {
        borderWidth: 1, borderColor: '#2563eb40', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, marginBottom: 8, marginRight: 8
    },
    opcionActiva: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    opcionTexto: { color: '#888', fontSize: 13 },
    opcionTextoActivo: { color: '#fff', fontWeight: '700' },
    boton: {
        backgroundColor: '#2563eb', borderRadius: 12,
        padding: 15, alignItems: 'center', flex: 1
    },
    botonDesactivado: { opacity: 0.6 },
    botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
    botonSecundario: {
        borderWidth: 1, borderColor: '#2563eb', borderRadius: 12,
        padding: 15, alignItems: 'center', flex: 1
    },
    botonSecundarioTexto: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
    filaBotones: { flexDirection: 'row', marginTop: 30 },
    linkLogin: { alignItems: 'center', marginTop: 30 },
    linkTexto: { color: '#666', fontSize: 14 },
    linkDestacado: { color: '#2563eb', fontWeight: '700' },
});