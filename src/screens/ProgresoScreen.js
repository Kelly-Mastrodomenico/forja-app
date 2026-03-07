import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, Dimensions, Alert
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function ProgresoScreen() {
    const [medidas, setMedidas] = useState([]);
    const [progreso, setProgreso] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [metricaActiva, setMetricaActiva] = useState('peso_kg');

    useFocusEffect(
        useCallback(() => {
            cargarHistorial();
        }, [])
    );

    async function cargarHistorial() {
        setCargando(true);
        try {
            const token = await AsyncStorage.getItem('forja_token');
            const respuesta = await axios.get(`${API_URL}/medidas/historial.php`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMedidas(respuesta.data.medidas);
            setProgreso(respuesta.data.progreso);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar el historial');
        } finally {
            setCargando(false);
        }
    }

    const metricas = [
        { key: 'peso_kg', label: 'Peso', unidad: 'kg', color: '#2563eb' },
        { key: 'grasa_corporal', label: 'Grasa', unidad: '%', color: '#ef4444' },
        { key: 'masa_muscular', label: 'Músculo', unidad: 'kg', color: '#16a34a' },
        { key: 'contenido_agua', label: 'Agua', unidad: '%', color: '#0ea5e9' },
    ];

    const metricaInfo = metricas.find(m => m.key === metricaActiva);

    function prepararDatosGrafica() {
        if (medidas.length < 2) return null;

        const valores = medidas
            .map(m => parseFloat(m[metricaActiva]))
            .filter(v => !isNaN(v) && v > 0);

        if (valores.length < 2) return null;

        const etiquetas = medidas
            .filter(m => parseFloat(m[metricaActiva]) > 0)
            .map(m => {
                const fecha = new Date(m.fecha);
                return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
            });

        return {
            labels: etiquetas.length > 6 ? etiquetas.filter((_, i) => i % Math.ceil(etiquetas.length / 6) === 0) : etiquetas,
            datasets: [{
                data: valores,
                color: () => metricaInfo.color,
                strokeWidth: 2,
            }]
        };
    }

    function IconoProgreso({ valor }) {
        if (!valor || valor === 0) return <Text style={estilos.progresoIcono}>—</Text>;
        if (valor > 0) return <Text style={[estilos.progresoIcono, { color: '#ef4444' }]}>↑</Text>;
        return <Text style={[estilos.progresoIcono, { color: '#16a34a' }]}>↓</Text>;
    }

    const datosGrafica = prepararDatosGrafica();

    if (cargando) {
        return (
            <View style={estilos.centrado}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={estilos.contenedor}>
            <View style={estilos.header}>
                <Text style={estilos.headerTitulo}>Mi Progreso</Text>
                <Text style={estilos.headerSub}>{medidas.length} mediciones registradas</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Sin datos */}
                {medidas.length === 0 && (
                    <View style={estilos.vacio}>
                        <Text style={estilos.vacioIcono}>📊</Text>
                        <Text style={estilos.vacioTitulo}>Sin mediciones aún</Text>
                        <Text style={estilos.vacioTexto}>
                            Sube la foto de tu báscula en Check-in para ver tu progreso aquí
                        </Text>
                    </View>
                )}

                {/* Resumen de progreso */}
                {progreso && (
                    <View style={estilos.resumenCard}>
                        <Text style={estilos.resumenTitulo}>
                            Progreso en {progreso.dias} días
                        </Text>
                        <View style={estilos.resumenGrid}>
                            <View style={estilos.resumenItem}>
                                <View style={estilos.resumenFila}>
                                    <IconoProgreso valor={progreso.peso} />
                                    <Text style={estilos.resumenValor}>
                                        {progreso.peso > 0 ? '+' : ''}{progreso.peso}
                                    </Text>
                                </View>
                                <Text style={estilos.resumenEtiqueta}>Peso kg</Text>
                            </View>
                            <View style={estilos.resumenItem}>
                                <View style={estilos.resumenFila}>
                                    <IconoProgreso valor={progreso.grasa} />
                                    <Text style={estilos.resumenValor}>
                                        {progreso.grasa > 0 ? '+' : ''}{progreso.grasa}%
                                    </Text>
                                </View>
                                <Text style={estilos.resumenEtiqueta}>Grasa</Text>
                            </View>
                            <View style={estilos.resumenItem}>
                                <View style={estilos.resumenFila}>
                                    <IconoProgreso valor={-progreso.musculo} />
                                    <Text style={estilos.resumenValor}>
                                        {progreso.musculo > 0 ? '+' : ''}{progreso.musculo}
                                    </Text>
                                </View>
                                <Text style={estilos.resumenEtiqueta}>Músculo kg</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Selector de métrica */}
                {medidas.length >= 2 && (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={estilos.metricasScroll}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                            {metricas.map(m => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        estilos.metricaBtn,
                                        metricaActiva === m.key && { backgroundColor: m.color }
                                    ]}
                                    onPress={() => setMetricaActiva(m.key)}
                                >
                                    <Text style={[
                                        estilos.metricaBtnTexto,
                                        metricaActiva === m.key && { color: '#fff' }
                                    ]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Gráfica */}
                        {datosGrafica && (
                            <View style={estilos.graficaContenedor}>
                                <Text style={estilos.graficaTitulo}>
                                    {metricaInfo.label} ({metricaInfo.unidad})
                                </Text>
                                <LineChart
                                    data={datosGrafica}
                                    width={width - 40}
                                    height={200}
                                    chartConfig={{
                                        backgroundColor: '#1a1a2e',
                                        backgroundGradientFrom: '#1a1a2e',
                                        backgroundGradientTo: '#1a1a2e',
                                        decimalPlaces: 1,
                                        color: () => metricaInfo.color,
                                        labelColor: () => '#666',
                                        propsForDots: {
                                            r: '4',
                                            strokeWidth: '2',
                                            stroke: metricaInfo.color,
                                        },
                                        propsForBackgroundLines: {
                                            stroke: '#ffffff10',
                                        },
                                    }}
                                    bezier
                                    style={estilos.grafica}
                                    withInnerLines={true}
                                    withOuterLines={false}
                                />
                            </View>
                        )}
                    </>
                )}

                {/* Historial de medidas */}
                {medidas.length > 0 && (
                    <View style={estilos.historialContenedor}>
                        <Text style={estilos.historialTitulo}>Historial de mediciones</Text>
                        {[...medidas].reverse().map((medida, index) => (
                            <View key={index} style={estilos.historialItem}>
                                <Text style={estilos.historialFecha}>{medida.fecha}</Text>
                                <View style={estilos.historialDatos}>
    {medida.peso_kg && (
        <Text style={estilos.historialDato}>⚖️ {medida.peso_kg} kg</Text>
    )}
    {medida.grasa_corporal && (
        <Text style={estilos.historialDato}>🔥 {medida.grasa_corporal}% grasa</Text>
    )}
    {medida.masa_muscular && (
        <Text style={estilos.historialDato}>💪 {medida.masa_muscular} kg músculo</Text>
    )}
    {medida.imc && (
        <Text style={estilos.historialDato}>📊 IMC {medida.imc}</Text>
    )}
</View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#0a0a1a' },
    centrado: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingTop: 55, paddingBottom: 16, paddingHorizontal: 24,
        borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
    },
    headerTitulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerSub: { color: '#555', fontSize: 13, marginTop: 4 },
    vacio: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
    vacioIcono: { fontSize: 50, marginBottom: 16 },
    vacioTitulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    vacioTexto: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
    resumenCard: {
        backgroundColor: '#1a1a2e', borderRadius: 16, margin: 20,
        padding: 20, borderWidth: 1, borderColor: '#2563eb20',
    },
    resumenTitulo: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginBottom: 16 },
    resumenGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    resumenItem: { alignItems: 'center' },
    resumenFila: { flexDirection: 'row', alignItems: 'center' },
    resumenIcono: { fontSize: 16, marginRight: 4 },
    progresoIcono: { fontSize: 18, fontWeight: '900', marginRight: 4 },
    resumenValor: { color: '#fff', fontSize: 18, fontWeight: '800' },
    resumenEtiqueta: { color: '#555', fontSize: 11, marginTop: 4 },
    metricasScroll: { marginVertical: 16 },
    metricaBtn: {
        borderWidth: 1, borderColor: '#2563eb40', borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 16, marginRight: 8,
    },
    metricaBtnTexto: { color: '#666', fontSize: 13, fontWeight: '600' },
    graficaContenedor: {
        backgroundColor: '#1a1a2e', borderRadius: 16,
        marginHorizontal: 20, padding: 16,
        borderWidth: 1, borderColor: '#2563eb15',
    },
    graficaTitulo: { color: '#aaa', fontSize: 12, fontWeight: '700', marginBottom: 12 },
    grafica: { borderRadius: 12 },
    historialContenedor: { paddingHorizontal: 20, marginTop: 24 },
    historialTitulo: { color: '#aaa', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
    historialItem: {
        backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: '#2563eb10',
    },
    historialFecha: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginBottom: 8 },
    historialDatos: { flexDirection: 'row', flexWrap: 'wrap' },
    historialDato: { color: '#888', fontSize: 13, marginRight: 16 },
});