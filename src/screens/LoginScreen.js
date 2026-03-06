import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Error', 'Completa todos los campos');
            return;
        }

        setCargando(true);
        try {
            const respuesta = await axios.post(`${API_URL}/auth/login.php`, {
                email: email.trim().toLowerCase(),
                password: password
            });

            // Login exitoso — navegamos al Home
            navigation.replace('Home', { usuario: respuesta.data.usuario });

        } catch (error) {
            const mensaje = error.response?.data?.error || 'Error al conectar con el servidor';
            Alert.alert('Error', mensaje);
        } finally {
            setCargando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={estilos.contenedor}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={estilos.inner}>

                {/* Logo / Título */}
                <View style={estilos.encabezado}>
                    <Text style={estilos.logo}>FORJA</Text>
                    <Text style={estilos.subtitulo}>Tu entrenador inteligente</Text>
                </View>

                {/* Formulario */}
                <View style={estilos.formulario}>
                    <Text style={estilos.etiqueta}>Email</Text>
                    <TextInput
                        style={estilos.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#666"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={estilos.etiqueta}>Contraseña</Text>
                    <TextInput
                        style={estilos.input}
                        placeholder="••••••••"
                        placeholderTextColor="#666"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={[estilos.boton, cargando && estilos.botonDesactivado]}
                        onPress={handleLogin}
                        disabled={cargando}
                    >
                        {cargando
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={estilos.botonTexto}>Entrar</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={estilos.linkRegistro}
                        onPress={() => navigation.navigate('Registro')}
                    >
                        <Text style={estilos.linkTexto}>
                            ¿No tienes cuenta? <Text style={estilos.linkDestacado}>Regístrate</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    encabezado: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logo: {
        fontSize: 52,
        fontWeight: '900',
        color: '#2563eb',
        letterSpacing: 8,
    },
    subtitulo: {
        fontSize: 14,
        color: '#888',
        marginTop: 6,
        letterSpacing: 2,
    },
    formulario: {
        width: '100%',
    },
    etiqueta: {
        color: '#ccc',
        fontSize: 13,
        marginBottom: 8,
        marginTop: 16,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2563eb40',
        borderRadius: 12,
        padding: 15,
        color: '#fff',
        fontSize: 15,
    },
    boton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
    },
    botonDesactivado: {
        opacity: 0.6,
    },
    botonTexto: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    linkRegistro: {
        alignItems: 'center',
        marginTop: 20,
    },
    linkTexto: {
        color: '#888',
        fontSize: 14,
    },
    linkDestacado: {
        color: '#2563eb',
        fontWeight: '700',
    },
});