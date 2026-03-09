import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen      from '../screens/HomeScreen';
import RutinaScreen    from '../screens/RutinaScreen';
import NutricionScreen from '../screens/NutricionScreen';
import ProgresoScreen  from '../screens/ProgresoScreen';
import PerfilScreen    from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();

const AZUL   = '#3b82f6';
const SUBTXT = '#6b7280';
const BORDE  = '#1a1a1a';

// Pantallas que tienen su propio header interno — no mostrar el global
const PANTALLAS_SIN_HEADER = ['Dashboard', 'Entreno', 'Perfil'];

function HeaderForja() {
    return (
        <View style={estilos.header}>
            <View style={estilos.logoRow}>
                <View style={estilos.logoIconBox}>
                    <Text style={estilos.logoIcono}>🔥</Text>
                </View>
                <Text style={estilos.logoTxt}>FORJA</Text>
            </View>
            <TouchableOpacity style={estilos.menuBtn}>
                <View style={estilos.menuLinea} />
                <View style={estilos.menuLinea} />
                <View style={estilos.menuLinea} />
            </TouchableOpacity>
        </View>
    );
}

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                // Mostrar header FORJA solo en pantallas que no tienen el suyo propio
                header: PANTALLAS_SIN_HEADER.includes(route.name)
                    ? undefined
                    : () => <HeaderForja />,
                headerShown: !PANTALLAS_SIN_HEADER.includes(route.name),

                tabBarStyle: {
                    backgroundColor: '#0f0f0f',
                    borderTopColor:  BORDE,
                    borderTopWidth:  1,
                    height:          70,
                    paddingBottom:   10,
                    paddingTop:      8,
                },
                tabBarActiveTintColor:   AZUL,
                tabBarInactiveTintColor: SUBTXT,
                tabBarLabelStyle: {
                    fontSize:   11,
                    fontWeight: '600',
                    marginTop:  2,
                },
                tabBarIcon: ({ focused }) => {
                    const iconos = {
                        Dashboard: '⚡',
                        Entreno:   '〜',
                        Nutrición: '🍊',
                        Análisis:  '📏',
                        Perfil:    '👤',
                    };
                    return (
                        <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
                            {iconos[route.name] || '●'}
                        </Text>
                    );
                },
            })}
        >
            <Tab.Screen name="Dashboard"  component={HomeScreen}      options={{ tabBarLabel: 'Inicio'    }} />
            <Tab.Screen name="Entreno"    component={RutinaScreen}    options={{ tabBarLabel: 'Entreno'   }} />
            <Tab.Screen name="Nutrición"  component={NutricionScreen} options={{ tabBarLabel: 'Nutrición' }} />
            <Tab.Screen name="Análisis"   component={ProgresoScreen}  options={{ tabBarLabel: 'Análisis'  }} />
            <Tab.Screen name="Perfil"     component={PerfilScreen}    options={{ tabBarLabel: 'Perfil'    }} />
        </Tab.Navigator>
    );
}

const estilos = StyleSheet.create({
    header: {
        flexDirection:     'row',
        justifyContent:    'space-between',
        alignItems:        'center',
        backgroundColor:   '#0a0a0a',
        paddingTop:        50,
        paddingBottom:     12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           10,
    },
    logoIconBox: {
        width:           36,
        height:          36,
        borderRadius:    10,
        backgroundColor: '#f97316',
        justifyContent:  'center',
        alignItems:      'center',
    },
    logoIcono: { fontSize: 18 },
    logoTxt: {
        color:         '#ffffff',
        fontSize:      20,
        fontWeight:    '800',
        letterSpacing: 1,
    },
    menuBtn: {
        padding: 8,
        gap:     5,
    },
    menuLinea: {
        width:           22,
        height:          2,
        backgroundColor: '#6b7280',
        borderRadius:    1,
    },
});