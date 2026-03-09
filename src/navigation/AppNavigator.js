import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen        from '../screens/LoginScreen';
import RegistroScreen     from '../screens/RegistroScreen';
import TabNavigator       from './TabNavigator';
import BasculaScreen      from '../screens/BasculaScreen';
import EscanearEtiqueta   from '../screens/EscanearEtiqueta';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [cargando, setCargando] = useState(true);
    const [hayToken, setHayToken] = useState(false);

    useEffect(() => {
        async function verificarSesion() {
            try {
                const token = await AsyncStorage.getItem('forja_token');
                setHayToken(!!token);
            } catch (e) {
                console.log('Error leyendo sesión:', e);
            } finally {
                setCargando(false);
            }
        }
        verificarSesion();
    }, []);

    if (cargando) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false, animation: 'fade' }}
                initialRouteName={hayToken ? 'Main' : 'Login'}
            >
                <Stack.Screen name="Main"             component={TabNavigator} />
                <Stack.Screen name="Login"            component={LoginScreen} />
                <Stack.Screen name="Registro"         component={RegistroScreen} />
                <Stack.Screen name="Bascula"          component={BasculaScreen} />
                <Stack.Screen name="EscanearEtiqueta" component={EscanearEtiqueta}
                    options={{ animation: 'slide_from_bottom' }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}