import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PerfilScreen({ navigation }) {
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
            <Text style={estilos.titulo}>Mi Perfil</Text>
            <Text style={estilos.subtitulo}>Próximamente...</Text>
            <TouchableOpacity style={estilos.botonSalir} onPress={handleCerrarSesion}>
                <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
            </TouchableOpacity>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
    titulo: { color: '#fff', fontSize: 24, fontWeight: '800' },
    subtitulo: { color: '#555', fontSize: 14, marginTop: 8, marginBottom: 40 },
    botonSalir: {
        borderWidth: 1, borderColor: '#2563eb',
        borderRadius: 12, paddingVertical: 12, paddingHorizontal: 30,
    },
    botonSalirTexto: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});