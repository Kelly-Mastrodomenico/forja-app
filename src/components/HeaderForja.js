import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HeaderForja({ derecha }) {
    return (
        <View style={estilos.header}>
            <View style={estilos.logoRow}>
                <View style={estilos.logoIconBox}>
                    <Text style={estilos.logoIcono}>🔥</Text>
                </View>
                <Text style={estilos.logoTxt}>FORJA</Text>
            </View>
            {/* Zona derecha personalizable por pantalla */}
            {derecha ? derecha : (
                <TouchableOpacity style={estilos.menuBtn}>
                    <View style={estilos.menuLinea} />
                    <View style={estilos.menuLinea} />
                    <View style={estilos.menuLinea} />
                </TouchableOpacity>
            )}
        </View>
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
    menuBtn: { padding: 8, gap: 5 },
    menuLinea: {
        width:           22,
        height:          2,
        backgroundColor: '#6b7280',
        borderRadius:    1,
    },
});