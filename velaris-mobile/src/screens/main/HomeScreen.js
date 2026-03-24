import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { isTrackingActive } from '../../services/locationService';
import { useAddress } from '../../hooks/useAddress';
import { formatDate, formatTime } from '../../utils/tripHelpers';
import { theme } from '../../utils/theme';

function LastTripCard({ trip }) {
  const startAddress = useAddress(trip.startLat, trip.startLng, trip.startAddress);
  const endAddress = useAddress(trip.endLat, trip.endLng, trip.endAddress);

  return (
    <View style={styles.lastTripCard}>
      <View style={styles.lastTripHeader}>
        <Text style={styles.sectionLabel}>Last Trip</Text>
        <Text style={styles.lastTripDate}>{formatDate(trip.startTime)}</Text>
      </View>
      <View style={styles.lastTripRoute}>
        <View style={styles.routePoint}>
          <View style={styles.dotOrigin} />
          <Text style={styles.routeAddress} numberOfLines={1}>{startAddress}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={styles.dotDest} />
          <Text style={styles.routeAddress} numberOfLines={1}>{endAddress}</Text>
        </View>
      </View>
      <View style={styles.lastTripMeta}>
        <Text style={styles.metaText}>
          {(trip.distanceMeters / 1000).toFixed(1)} km
        </Text>
        <View style={styles.metaDot} />
        <Text style={styles.metaText}>
          {formatTime(trip.startTime)}
        </Text>
      </View>
    </View>
  );
}

function TopPatternCard({ pattern }) {
  const destAddress = useAddress(pattern.destLat, pattern.destLng);

  return (
    <View style={styles.patternPreviewCard}>
      <View style={styles.patternPreviewHeader}>
        <Text style={styles.sectionLabel}>Top Pattern</Text>
        <View style={styles.confidencePill}>
          <Text style={styles.confidencePillText}>
            {Math.round(pattern.confidence * 100)}%
          </Text>
        </View>
      </View>
      <Text style={styles.patternDestText} numberOfLines={1}>{destAddress}</Text>
      <Text style={styles.patternMetaText}>
        {pattern.tripCount} trips · Usually {formatPatternHour(pattern.avgDepartureHour)}
      </Text>
    </View>
  );
}

function formatPatternHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function HomeScreen({ navigation }) {
  const { user, userProfile, logOut } = useAuth();
  const [tripCount, setTripCount] = useState(0);
  const [patternCount, setPatternCount] = useState(0);
  const [lastTrip, setLastTrip] = useState(null);
  const [topPattern, setTopPattern] = useState(null);
  const [tracking, setTracking] = useState(false);

  const firstName = userProfile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    if (!user) return;

    // Trips listener
    const tripsUnsub = onSnapshot(
      query(
        collection(db, 'velaris', user.uid, 'trips'),
        orderBy('startTime', 'desc'),
        limit(1)
      ),
      (snap) => {
        setTripCount(snap.size);
        if (!snap.empty) setLastTrip({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    );

    // Trip count
    const countUnsub = onSnapshot(
      collection(db, 'velaris', user.uid, 'trips'),
      (snap) => setTripCount(snap.size)
    );

    // Patterns listener
    const patternsUnsub = onSnapshot(
      query(
        collection(db, 'velaris', user.uid, 'patterns'),
        where('active', '==', true)
      ),
      (snap) => {
        setPatternCount(snap.size);
        if (!snap.empty) {
          const sorted = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => b.confidence - a.confidence);
          setTopPattern(sorted[0]);
        }
      }
    );

    // Tracking status
    isTrackingActive().then(setTracking); // initial check

    const trackingInterval = setInterval(() => {
      isTrackingActive().then(setTracking);
    }, 3000); // re-check every 3 seconds

    // And add it to the cleanup return:
    return () => {
      tripsUnsub();
      countUnsub();
      patternsUnsub();
      clearInterval(trackingInterval); // ← add this
    };
  }, [user]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={logOut}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status pill */}
      <View style={[styles.statusPill, tracking ? styles.statusPillActive : styles.statusPillInactive]}>
        <View style={[styles.statusDot, { backgroundColor: tracking ? theme.colors.success : theme.colors.textMuted }]} />
        <Text style={[styles.statusText, { color: tracking ? theme.colors.success : theme.colors.textMuted }]}>
          {tracking ? 'Learning your patterns' : 'Tracking paused'}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{tripCount}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patternCount}</Text>
          <Text style={styles.statLabel}>Patterns</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {patternCount > 0 ? `${Math.round(topPattern?.confidence * 100 || 0)}%` : '—'}
          </Text>
          <Text style={styles.statLabel}>Confidence</Text>
        </View>
      </View>

      {/* Last trip */}
      {lastTrip && <LastTripCard trip={lastTrip} />}

      {/* Top pattern */}
      {topPattern && <TopPatternCard pattern={topPattern} />}

      {/* Empty state */}
      {tripCount === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="navigate-outline" size={32} color={theme.colors.accentPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Velaris is watching</Text>
          <Text style={styles.emptySub}>
            Go about your day normally.{'\n'}
            Your patterns will appear here automatically.
          </Text>
        </View>
      )}

      {/* Nav hints */}
      <View style={styles.navHints}>
        <TouchableOpacity
          style={styles.navHint}
          onPress={() => navigation.navigate('Trips')}
        >
          <Ionicons name="map-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.navHintText}>View all trips</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navHint}
          onPress={() => navigation.navigate('Patterns')}
        >
          <Ionicons name="analytics-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.navHintText}>View all patterns</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 64,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: 'rgba(72, 187, 120, 0.08)',
    borderColor: 'rgba(72, 187, 120, 0.2)',
  },
  statusPillInactive: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderColor: theme.colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastTripCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  lastTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastTripDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  lastTripRoute: {
    gap: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentPrimary,
  },
  dotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentSecondary,
  },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.border,
    marginLeft: 3.5,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  lastTripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textMuted,
  },
  patternPreviewCard: {
    backgroundColor: 'rgba(123, 94, 167, 0.06)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(123, 94, 167, 0.15)',
    padding: theme.spacing.md,
    gap: 6,
  },
  patternPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidencePill: {
    backgroundColor: 'rgba(123, 94, 167, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  confidencePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accentPrimary,
  },
  patternDestText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  patternMetaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: theme.spacing.xl,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(123, 94, 167, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123, 94, 167, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  navHints: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  navHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  navHintText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});