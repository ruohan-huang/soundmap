import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const SoundmapKey: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const [heightAnim] = useState(new Animated.Value(50)); // start with collapsed height

    const toggleExpand = () => {
        Animated.timing(heightAnim, {
            toValue: expanded ? 50 : 180, // expand to show full key
            duration: 300,
            useNativeDriver: false,
        }).start();

        setExpanded(!expanded);
    };

    return (
        <Animated.View style={[styles.keyContainer, { height: heightAnim }]}>
            <TouchableOpacity style={styles.arrowContainer} onPress={toggleExpand}>
                <Text style={styles.arrow}>{expanded ? 'Key ↓' : 'Key ↑'}</Text>
            </TouchableOpacity>
            {expanded && (
                <View style={styles.keyContent}>
                    <View style={styles.colorBlockRow}>
                        <View style={[styles.colorBlock, { backgroundColor: 'red' }]} />
                        <Text style={styles.text}>80+ dB</Text>
                    </View>
                    <View style={styles.colorBlockRow}>
                        <View style={[styles.colorBlock, { backgroundColor: 'orange' }]} />
                        <Text style={styles.text}>65-79 dB</Text>
                    </View>
                    <View style={styles.colorBlockRow}>
                        <View style={[styles.colorBlock, { backgroundColor: 'yellow' }]} />
                        <Text style={styles.text}>50-64 dB</Text>
                    </View>
                    <View style={styles.colorBlockRow}>
                        <View style={[styles.colorBlock, { backgroundColor: 'green' }]} />
                        <Text style={styles.text}>10-49 dB</Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    keyContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 150,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 5, // for Android shadow
        shadowColor: '#000', // for iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    arrowContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#f0f0f0',
    },
    arrow: {
        fontSize: 18,
    },
    keyContent: {
        padding: 10,
    },
    colorBlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    colorBlock: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    text: {
        fontSize: 16,
    },
});

export default SoundmapKey;