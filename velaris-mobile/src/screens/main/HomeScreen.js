import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';

export function HomeScreen({ navigation }) {
    const { user, userProfile, logOut } = useAuth();
    const [tripCount, setTripCount] = useState(0);
    const [patternCount, setPatternCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Listen to trip count
        const tripsUnsub = onSnapshot(
            collection(db, 'velaris_trips', user.uid, 'trips'),
            (snap) => setTripCount(snap.size)
        );

        // Listen to pattern count
        const patternsUnsub = onSnapshot(
            query(
                collection(db, 'velaris_patterns', user.uid, 'patterns'),
                where('active', '==', true)
            ),
            (snap) => setPatternCount(snap.size)
        );

        return () => {
            tripsUnsub();
            patternsUnsub();
        };
    }, [user]);

    const testNotification = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Enable notifications in Settings');
            return;
        }
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Velaris',
                body: 'Heading to 53.5232, -113.5263? Your usual route is ready.',
                sound: true,
            },
            trigger: null,
        });
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = userProfile?.name?.split(' ')[0] || 'there';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{greeting()},</Text>
                    <Text style={styles.name}>{firstName}</Text>
                </View>
                <TouchableOpacity style={styles.avatar} onPress={logOut}>
                    <Text style={styles.avatarText}>
                        {firstName.charAt(0).toUpperCase()}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Logo */}
            <View style={styles.logoRow}>
                <Text style={styles.logo}>VELARIS</Text>
                <Text style={styles.logoSub}>by Velarox</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Ionicons name="map-outline" size={22} color={theme.colors.accentPrimary} />
                    <Text style={styles.statValue}>{tripCount}</Text>
                    <Text style={styles.statLabel}>Trips logged</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="analytics-outline" size={22} color={theme.colors.accentSecondary} />
                    <Text style={styles.statValue}>{patternCount}</Text>
                    <Text style={styles.statLabel}>Patterns found</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="sparkles-outline" size={22} color={theme.colors.success} />
                    <Text style={styles.statValue}>
                        {patternCount > 0 ? 'On' : 'Off'}
                    </Text>
                    <Text style={styles.statLabel}>Intelligence</Text>
                </View>
            </View>

            {/* Status card */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={theme.colors.accentPrimary}
                    />
                    <Text style={styles.statusTitle}>How Velaris works</Text>
                </View>
                <Text style={styles.statusBody}>
                    Go to the Trips tab and tap Start. Walk the same route 3 or more times
                    and Velaris will detect the pattern automatically. Once a pattern is
                    confirmed, you'll get a notification the next time you're near that origin.
                </Text>
            </View>

            {/* Quick actions */}
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionsCol}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.getParent()?.navigate('Trips')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(123, 94, 167, 0.15)' }]}>
                        <Ionicons name="play-circle-outline" size={22} color={theme.colors.accentPrimary} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Start tracking</Text>
                        <Text style={styles.actionSub}>Record a new trip</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.getParent()?.navigate('Patterns')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(91, 141, 239, 0.15)' }]}>
                        <Ionicons name="git-branch-outline" size={22} color={theme.colors.accentSecondary} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>View patterns</Text>
                        <Text style={styles.actionSub}>See what Velaris learned</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={testNotification}
                >
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(72, 187, 120, 0.15)' }]}>
                        <Ionicons name="notifications-outline" size={22} color={theme.colors.success} />
                    </View>
                    <View style={styles.actionText}>
                        <Text style={styles.actionTitle}>Test notification</Text>
                        <Text style={styles.actionSub}>Preview how alerts look</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingTop: 60, paddingBottom: theme.spacing.xxl },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xl,
    },
    greeting: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    name: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.accentPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    logoRow: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: 8,
    },
    logoSub: {
        fontSize: 12,
        color: theme.colors.accentPrimary,
        letterSpacing: 2,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    statusCard: {
        backgroundColor: 'rgba(123, 94, 167, 0.08)',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(123, 94, 167, 0.2)',
        marginBottom: theme.spacing.lg,
        gap: 8,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.accentPrimary,
    },
    statusBody: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
    },
    actionsCol: { gap: theme.spacing.sm },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: { flex: 1 },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    actionSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});