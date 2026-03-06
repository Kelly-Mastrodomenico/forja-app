import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function RegistroScreen({ navigation }) {
    return (
        <View style={estilos.contenedor}>
            <Text style={estilos.logo}>FORJA</Text>
            <Text style={estilos.texto}>Pantalla de registro</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={estilos.link}>← Volver al login</Text>
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
    },
    logo: {
        fontSize: 52,
        fontWeight: '900',
        color: '#2563eb',
        letterSpacing: 8,
        marginBottom: 20,
    },
    texto: {
        color: '#888',
        fontSize: 16,
        marginBottom: 30,
    },
    link: {
        color: '#2563eb',
        fontSize: 15,
    },
});