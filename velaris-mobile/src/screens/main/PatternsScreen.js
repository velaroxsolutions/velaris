import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useAddress } from '../../hooks/useAddress';
import { theme } from '../../utils/theme';

function PatternCard({ item }) {
    const originAddress = useAddress(item.originLat, item.originLng);
    const destAddress = useAddress(item.destLat, item.destLng);

    const confidencePct = Math.round(item.confidence * 100);
    const confidenceColor =
        item.confidence >= 0.8 ? theme.colors.success :
        item.confidence >= 0.6 ? theme.colors.warning :
        theme.colors.accentPrimary;

    const formatHour = (hour) => {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <View style={styles.patternCard}>
            <View style={styles.cardHeader}>
                <View style={styles.routeIcon}>
                    <Ionicons name="git-branch-outline" size={16} color={theme.colors.accentPrimary} />
                </View>
                <View style={styles.confidenceBadge}>
                    <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
                    <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                        {confidencePct}% confidence
                    </Text>
                </View>
            </View>

            <View style={styles.routeRow}>
                <View style={styles.coordBlock}>
                    <Text style={styles.coordLabel}>FROM</Text>
                    <Text style={styles.coordValue} numberOfLines={2}>{originAddress}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
                <View style={styles.coordBlock}>
                    <Text style={styles.coordLabel}>TO</Text>
                    <Text style={styles.coordValue} numberOfLines={2}>{destAddress}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Ionicons name="repeat-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.statText}>{item.tripCount} trips</Text>
                </View>
                <View style={styles.stat}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                    <Text style={styles.statText}>
                        Usually {formatHour(item.avgDepartureHour)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export function PatternsScreen() {
    const { user } = useAuth();
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'velaris', user.uid, 'patterns'),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPatterns(data);
            setLoading(false);
        }, (error) => {
            console.error('Patterns error:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    const renderPattern = ({ item }) => <PatternCard item={item} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Patterns</Text>
                    <Text style={styles.headerSub}>
                        {patterns.length} detected
                    </Text>
                </View>
                <View style={styles.headerBadge}>
                    <Ionicons name="sparkles-outline" size={14} color={theme.colors.accentPrimary} />
                    <Text style={styles.headerBadgeText}>ML</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.accentPrimary} />
                </View>
            ) : patterns.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="analytics-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No patterns yet</Text>
                    <Text style={styles.emptySub}>
                        Take the same route 3 or more times.{'\n'}
                        Velaris will detect the pattern automatically.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={patterns}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPattern}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    headerSub: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(123, 94, 167, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(123, 94, 167, 0.3)',
    },
    headerBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.accentPrimary,
        letterSpacing: 1,
    },
    list: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    patternCard: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    routeIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(123, 94, 167, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    confidenceDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    confidenceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    coordBlock: { flex: 1 },
    coordLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textMuted,
        letterSpacing: 1,
        marginBottom: 2,
    },
    coordValue: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    emptySub: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});