import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import RutinaScreen from '../screens/RutinaScreen';
import NutricionScreen from '../screens/NutricionScreen';
import ProgresoScreen from '../screens/ProgresoScreen';
import PerfilScreen from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();

function Icono({ nombre, focused }) {
    const iconos = {
        'Inicio': '🏠',
        'Rutina': '💪',
        'Nutricion': '🍽️',
        'Progreso': '📊',
        'Perfil': '👤',
    };
    return (
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>
            {iconos[nombre]}
        </Text>
    );
}

export default function TabNavigator({ route }) {
    const { usuario } = route.params || {};

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f0f1f',
                    borderTopColor: '#1a1a2e',
                    borderTopWidth: 1,
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#444',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused }) => (
                    <Icono nombre={route.name} focused={focused} />
                ),
            })}
        >
            <Tab.Screen
                name="Inicio"
                component={HomeScreen}
                initialParams={{ usuario }}
            />
            <Tab.Screen name="Rutina" component={RutinaScreen} />
            <Tab.Screen name="Nutricion" component={NutricionScreen}
                options={{ tabBarLabel: 'Nutrición' }}
            />
            <Tab.Screen name="Progreso" component={ProgresoScreen} />
            <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}