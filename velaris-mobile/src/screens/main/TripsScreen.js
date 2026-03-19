import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';
import {
    requestLocationPermissions,
    startLocationTracking,
    stopLocationTracking,
    isTrackingActive,
} from '../../services/locationService';
import { formatDuration, formatTime, formatDate } from '../../utils/tripHelpers';
import { theme } from '../../utils/theme';

export function TripsScreen() {
    const { user } = useAuth();
    const { trips, loading } = useTrips();
    const [tracking, setTracking] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const flatListRef = useRef(null);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        checkTracking();
    }, []);

    const checkTracking = async () => {
        const active = await isTrackingActive();
        setTracking(active);
        setCheckingStatus(false);
    };

    const toggleTracking = async () => {
        if (toggling) return; // prevent double press
        setToggling(true);

        try {
            if (tracking) {
                await stopLocationTracking();
                setTracking(false);
            } else {
                console.log('Requesting permissions...');
                const granted = await requestLocationPermissions();
                console.log('Granted:', granted);
                if (!granted) {
                    Alert.alert('Permission Required', 'Enable background location in Settings.');
                    return;
                }
                console.log('Starting tracking...');
                await startLocationTracking(user.uid);
                console.log('Tracking started, setting state...');
                setTracking(true);
            }
        } catch (error) {
            console.log('Toggle error:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setToggling(false);
        }
    };

    const renderTrip = ({ item, index }) => {
        const showDateHeader =
            index === 0 ||
            formatDate(item.startTime) !== formatDate(trips[index - 1]?.startTime);

        const distanceKm = (item.distanceMeters / 1000).toFixed(1);

        return (
            <View>
                {showDateHeader && (
                    <Text style={styles.dateHeader}>{formatDate(item.startTime)}</Text>
                )}
                <View style={styles.tripCard}>
                    <View style={styles.timelineCol}>
                        <View style={styles.dotStart} />
                        <View style={styles.timelineLine} />
                        <View style={styles.dotEnd} />
                    </View>
                    <View style={styles.tripContent}>
                        <View style={styles.pointRow}>
                            <Text style={styles.coordText}>
                                {item.startLat?.toFixed(4)}, {item.startLng?.toFixed(4)}
                            </Text>
                            <Text style={styles.timeText}>{formatTime(item.startTime)}</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.badge}>
                                <Ionicons name="navigate-outline" size={11} color={theme.colors.accentPrimary} />
                                <Text style={styles.badgeText}>{distanceKm} km</Text>
                            </View>
                            <View style={styles.badge}>
                                <Ionicons name="time-outline" size={11} color={theme.colors.accentSecondary} />
                                <Text style={styles.badgeText}>
                                    {formatDuration(item.startTime, item.endTime)}
                                </Text>
                            </View>
                            <View style={styles.badge}>
                                <Ionicons name="location-outline" size={11} color={theme.colors.textMuted} />
                                <Text style={styles.badgeText}>{item.pointCount} pts</Text>
                            </View>
                        </View>
                        <View style={styles.pointRow}>
                            <Text style={styles.coordText}>
                                {item.endLat?.toFixed(4)}, {item.endLng?.toFixed(4)}
                            </Text>
                            <Text style={styles.timeText}>{formatTime(item.endTime)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (checkingStatus) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={theme.colors.accentPrimary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Trips</Text>
                    <Text style={styles.headerSub}>{trips.length} recorded</Text>
                </View>
                <TouchableOpacity
                    style={[styles.trackingBtn, tracking && styles.trackingBtnActive]}
                    onPress={toggleTracking}
                    activeOpacity={0.8}
                    disabled={toggling}
                >
                    <Ionicons
                        name={toggling ? 'hourglass-outline' : tracking ? 'stop-circle' : 'play-circle'}
                        size={18}
                        color={toggling ? theme.colors.textMuted : tracking ? theme.colors.error : theme.colors.success}
                    />
                    <Text style={[styles.trackingBtnText, tracking && styles.trackingBtnTextActive]}>
                        {toggling ? 'Please wait...' : tracking ? 'Stop' : 'Start'}
                    </Text>
                </TouchableOpacity>            </View>

            {tracking && (
                <View style={styles.banner}>
                    <View style={styles.bannerDot} />
                    <Text style={styles.bannerText}>
                        Learning your patterns in the background
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.accentPrimary} />
                </View>
            ) : trips.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No trips yet</Text>
                    <Text style={styles.emptySub}>
                        Tap Start, take a walk, and stop for a minute.{'\n'}
                        Your trip will appear here automatically.
                    </Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={trips}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTrip}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}
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
    trackingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.backgroundTertiary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    trackingBtnActive: {
        borderColor: theme.colors.error,
        backgroundColor: 'rgba(252, 129, 129, 0.1)',
    },
    trackingBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    trackingBtnTextActive: {
        color: theme.colors.error,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(123, 94, 167, 0.12)',
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(123, 94, 167, 0.3)',
    },
    bannerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.accentPrimary,
    },
    bannerText: {
        fontSize: 13,
        color: theme.colors.accentPrimary,
        flex: 1,
    },
    list: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    dateHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    tripCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
    },
    timelineCol: {
        alignItems: 'center',
        paddingTop: 2,
        width: 12,
    },
    dotStart: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.accentPrimary,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        minHeight: 28,
        backgroundColor: theme.colors.border,
        marginVertical: 3,
    },
    dotEnd: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.accentSecondary,
    },
    tripContent: { flex: 1 },
    pointRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coordText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    timeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 6,
        marginVertical: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.backgroundTertiary,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: theme.borderRadius.full,
    },
    badgeText: {
        fontSize: 11,
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