import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ route, navigation }) {
    const [usuario, setUsuario] = useState(route?.params?.usuario || {});

    useEffect(() => {
        async function cargarUsuario() {
            if (!usuario?.nombre) {
                const datos = await AsyncStorage.getItem('forja_usuario');
                if (datos) setUsuario(JSON.parse(datos));
            }
        }
        cargarUsuario();
    }, []);

    const saludo = () => {
        const hora = new Date().getHours();
        if (hora < 12) return 'Buenos días';
        if (hora < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const objetivoTexto = {
        perder_grasa: '🔥 Perder grasa',
        ganar_musculo: '💪 Ganar músculo',
        recomposicion: '⚡ Recomposición',
        mantenimiento: '✅ Mantenimiento',
    };

    return (
        <View style={estilos.contenedor}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={estilos.header}>
                    <View>
                        <Text style={estilos.saludo}>{saludo()},</Text>
                        <Text style={estilos.nombre}>{usuario?.nombre?.split(' ')[0] || 'Atleta'} 💪</Text>
                    </View>
                    <View style={estilos.badge}>
                        <Text style={estilos.badgeTexto}>
                            {objetivoTexto[usuario?.objetivo] || '⚡'}
                        </Text>
                    </View>
                </View>

                {/* Tarjeta principal */}
                <View style={estilos.tarjetaPrincipal}>
                    <Text style={estilos.tarjetaTitulo}>FORJA</Text>
                    <Text style={estilos.tarjetaSubtitulo}>Tu entrenador inteligente</Text>
                    <View style={estilos.separador} />
                    <Text style={estilos.tarjetaInfo}>
                        Nivel: <Text style={estilos.tarjetaDestacado}>{usuario?.nivel || '-'}</Text>
                        {'   '}
                        Días: <Text style={estilos.tarjetaDestacado}>{usuario?.dias_entrenamiento || '-'} por semana</Text>
                    </Text>
                </View>

                {/* Accesos rápidos */}
                <Text style={estilos.seccionTitulo}>Accesos rápidos</Text>
                <View style={estilos.grid}>
                    {[
    { icono: '💪', titulo: 'Mi Rutina', desc: 'Ver plan de hoy' },
    { icono: '🍽️', titulo: 'Nutrición', desc: 'Plan alimenticio' },
    { icono: '📊', titulo: 'Progreso', desc: 'Ver evolución' },
    { icono: '📸', titulo: 'Check-in', desc: 'Registrar medidas' },
].map((item, index) => (
    <TouchableOpacity
        key={index}
        style={estilos.gridItem}
        onPress={() => {
    if (item.titulo === 'Check-in') navigation.navigate('Bascula');
    if (item.titulo === 'Progreso') navigation.navigate('Progreso');
    if (item.titulo === 'Mi Rutina') navigation.navigate('Rutina');
}}funciona
    >
        <Text style={estilos.gridIcono}>{item.icono}</Text>
        <Text style={estilos.gridTitulo}>{item.titulo}</Text>
        <Text style={estilos.gridDesc}>{item.desc}</Text>
    </TouchableOpacity>
))}
</View>

                {/* Tips del día */}
                <View style={estilos.tip}>
                    <Text style={estilos.tipIcono}>💡</Text>
                    <Text style={estilos.tipTexto}>
                        Recuerda hidratarte bien durante el entrenamiento. Bebe al menos 500ml de agua por hora de ejercicio.
                    </Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 55,
        paddingBottom: 20,
    },
    saludo: { color: '#666', fontSize: 14 },
    nombre: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
    badge: {
        backgroundColor: '#2563eb20',
        borderWidth: 1,
        borderColor: '#2563eb40',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    badgeTexto: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
    tarjetaPrincipal: {
        margin: 20,
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
    },
    tarjetaTitulo: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 6,
    },
    tarjetaSubtitulo: { color: '#ffffff99', fontSize: 13, marginTop: 4 },
    separador: { height: 1, backgroundColor: '#ffffff30', marginVertical: 16 },
    tarjetaInfo: { color: '#ffffff99', fontSize: 13 },
    tarjetaDestacado: { color: '#fff', fontWeight: '700', textTransform: 'capitalize' },
    seccionTitulo: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    gridItem: {
        width: '46%',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 18,
        margin: '2%',
        borderWidth: 1,
        borderColor: '#2563eb15',
    },
    gridIcono: { fontSize: 28, marginBottom: 10 },
    gridTitulo: { color: '#fff', fontSize: 14, fontWeight: '700' },
    gridDesc: { color: '#555', fontSize: 12, marginTop: 4 },
    tip: {
        flexDirection: 'row',
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        margin: 20,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb',
        alignItems: 'flex-start',
    },
    tipIcono: { fontSize: 20, marginRight: 12, marginTop: 2 },
    tipTexto: { color: '#888', fontSize: 13, lineHeight: 20, flex: 1 },
});