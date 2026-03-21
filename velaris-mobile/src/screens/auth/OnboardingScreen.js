import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Dimensions,
    TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        icon: 'eye-outline',
        title: 'It watches.',
        subtitle: 'Velaris runs silently in the background, learning every route you take — without you lifting a finger.',
        accent: theme.colors.accentPrimary,
    },
    {
        id: '2',
        icon: 'analytics-outline',
        title: 'It learns.',
        subtitle: 'After a few trips, patterns emerge. Your commute. Your routine. Your life — understood.',
        accent: theme.colors.accentSecondary,
    },
    {
        id: '3',
        icon: 'flash-outline',
        title: 'It acts.',
        subtitle: 'Before you even think to check — Velaris tells you where you\'re headed and how to get there.',
        accent: theme.colors.success,
    },
];

export function OnboardingScreen({ navigation }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            navigation.replace('Login');
        }
    };

    const renderSlide = ({ item }) => (
        <View style={styles.slide}>
            <View style={[styles.iconRing, { borderColor: item.accent + '30' }]}>
                <View style={[styles.iconInner, { backgroundColor: item.accent + '15' }]}>
                    <Ionicons name={item.icon} size={48} color={item.accent} />
                </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
    );

    const renderDot = (index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 24, 6],
            extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View
                key={index}
                style={[
                    styles.dot,
                    {
                        width: dotWidth,
                        opacity,
                        backgroundColor: slides[currentIndex].accent,
                    }
                ]}
            />
        );
    };

    return (
        <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoRow}>
                <Text style={styles.logo}>VELARIS</Text>
                <Text style={styles.logoBy}>by Velarox</Text>
            </View>

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item) => item.id}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {/* Bottom */}
            <View style={styles.bottom}>
                {/* Dots */}
                <View style={styles.dots}>
                    {slides.map((_, index) => renderDot(index))}
                </View>

                {/* Next button */}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: slides[currentIndex].accent }]}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={styles.nextText}>
                        {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    <Ionicons
                        name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
                        size={18}
                        color="#fff"
                    />
                </TouchableOpacity>

                {/* Skip */}
                {currentIndex < slides.length - 1 && (
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={() => navigation.replace('Login')}
                    >
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    logoRow: {
        alignItems: 'center',
        paddingTop: 72,
        paddingBottom: theme.spacing.lg,
    },
    logo: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: 8,
    },
    logoBy: {
        fontSize: 11,
        color: theme.colors.textMuted,
        letterSpacing: 2,
        marginTop: 4,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
        gap: theme.spacing.lg,
    },
    iconRing: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    iconInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 40,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    bottom: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 48,
        gap: theme.spacing.md,
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 18,
        borderRadius: theme.borderRadius.md,
    },
    nextText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    skipBtn: {
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
});