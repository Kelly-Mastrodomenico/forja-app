import { View, Text, StyleSheet } from 'react-native';

export default function NutricionScreen() {
    return (
        <View style={estilos.contenedor}>
            <Text style={estilos.titulo}>Nutrición</Text>
            <Text style={estilos.subtitulo}>Próximamente...</Text>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
    titulo: { color: '#fff', fontSize: 24, fontWeight: '800' },
    subtitulo: { color: '#555', fontSize: 14, marginTop: 8 },
});