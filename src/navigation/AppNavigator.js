import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import RegistroScreen from '../screens/RegistroScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [cargando, setCargando] = useState(true);
    const [usuarioGuardado, setUsuarioGuardado] = useState(null);

    useEffect(() => {
        async function verificarSesion() {
            try {
                const datos = await AsyncStorage.getItem('forja_usuario');
                if (datos) {
                    setUsuarioGuardado(JSON.parse(datos));
                }
            } catch (error) {
                console.log('Error leyendo sesión:', error);
            } finally {
                setCargando(false);
            }
        }
        verificarSesion();
    }, []);

    if (cargando) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    initialParams={{ usuario: usuarioGuardado || {} }}
                />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Registro" component={RegistroScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}