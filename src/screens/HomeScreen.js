import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ route, navigation }) {
    const usuario = route?.params?.usuario || {};

    useEffect(() => {
        if (!usuario?.nombre) {
            navigation.replace('Login');
        }
    }, []);

    async function handleCerrarSesion() {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás segura?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('forja_usuario');
                        await AsyncStorage.removeItem('forja_token');
                        navigation.replace('Login');
                    }
                }
            ]
        );
    }

    return (
        <View style={estilos.contenedor}>
            <Text style={estilos.logo}>FORJA</Text>
            <Text style={estilos.bienvenida}>Hola, {usuario?.nombre?.split(' ')[0] || 'Atleta'} 💪</Text>
            <Text style={estilos.objetivo}>Objetivo: {usuario?.objetivo?.replace('_', ' ') || ''}</Text>
            <Text style={estilos.nivel}>Nivel: {usuario?.nivel || ''}</Text>

            <TouchableOpacity style={estilos.botonSalir} onPress={handleCerrarSesion}>
                <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
            </TouchableOpacity>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#0a0a1a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    logo: {
        fontSize: 48,
        fontWeight: '900',
        color: '#2563eb',
        letterSpacing: 8,
        marginBottom: 30,
    },
    bienvenida: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    objetivo: {
        color: '#888',
        fontSize: 15,
        marginBottom: 8,
        textTransform: 'capitalize',
    },
    nivel: {
        color: '#888',
        fontSize: 15,
        textTransform: 'capitalize',
    },
    botonSalir: {
        marginTop: 50,
        borderWidth: 1,
        borderColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 30,
    },
    botonSalirTexto: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '600',
    },
});