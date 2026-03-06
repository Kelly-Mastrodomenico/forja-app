import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen({ route }) {
    const { usuario } = route.params;

    return (
        <View style={estilos.contenedor}>
            <Text style={estilos.bienvenida}>¡Bienvenido a</Text>
            <Text style={estilos.logo}>FORJA</Text>
            <Text style={estilos.nombre}>{usuario.nombre} 💪</Text>
            <Text style={estilos.objetivo}>Objetivo: {usuario.objetivo}</Text>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#0a0a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bienvenida: {
        color: '#888',
        fontSize: 16,
    },
    logo: {
        fontSize: 60,
        fontWeight: '900',
        color: '#2563eb',
        letterSpacing: 8,
    },
    nombre: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginTop: 20,
    },
    objetivo: {
        color: '#888',
        fontSize: 14,
        marginTop: 8,
    },
});