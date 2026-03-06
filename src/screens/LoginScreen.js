import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Campos vacíos', 'Escribe tu email y contraseña');
            return;
        }

        setCargando(true);
        try {
            const respuesta = await axios.post(`${API_URL}/auth/login.php`, {
                email: email.trim().toLowerCase(),
                password: password
            });

            // Guardar usuario y token en el dispositivo
            await AsyncStorage.setItem('forja_usuario', JSON.stringify(respuesta.data.usuario));
            await AsyncStorage.setItem('forja_token', respuesta.data.usuario.token);

            navigation.replace('Home', { usuario: respuesta.data.usuario });

        } catch (error) {
            const mensaje = error.response?.data?.error || 'No se pudo conectar al servidor.\nVerifica tu WiFi.';
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

                <View style={estilos.encabezado}>
                    <Text style={estilos.logo}>FORJA</Text>
                    <Text style={estilos.subtitulo}>Tu entrenador inteligente</Text>
                </View>

                <View style={estilos.formulario}>
                    <Text style={estilos.etiqueta}>Email</Text>
                    <TextInput
                        style={estilos.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#555"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={estilos.etiqueta}>Contraseña</Text>
                    <TextInput
                        style={estilos.input}
                        placeholder="••••••••"
                        placeholderTextColor="#555"
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
                            ¿No tienes cuenta?{'  '}
                            <Text style={estilos.linkDestacado}>Regístrate</Text>
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
        color: '#666',
        marginTop: 6,
        letterSpacing: 2,
    },
    formulario: {
        width: '100%',
    },
    etiqueta: {
        color: '#aaa',
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
        marginTop: 24,
    },
    linkTexto: {
        color: '#666',
        fontSize: 14,
    },
    linkDestacado: {
        color: '#2563eb',
        fontWeight: '700',
    },
});