import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import {
  getAddressFromCoords,
  getRoutingData,
  getModeIcon,
  getModeLabel,
  getGoogleMapsUrl,
} from '../../services/routingService';

export function RouteCardScreen({ route, navigation }) {
  const pattern = route?.params?.pattern;

  const [loading, setLoading] = useState(true);
  const [originAddress, setOriginAddress] = useState('Loading...');
  const [destAddress, setDestAddress] = useState('Loading...');
  const [routingData, setRoutingData] = useState(null);
  const [selectedMode, setSelectedMode] = useState('driving');

  useEffect(() => {
    if (pattern) {
      loadRouteData();
    }
  }, [pattern]);

  const loadRouteData = async () => {
    setLoading(true);
    try {
      const [originAddr, destAddr, routing] = await Promise.all([
        getAddressFromCoords(pattern.originLat, pattern.originLng),
        getAddressFromCoords(pattern.destLat, pattern.destLng),
        getRoutingData(pattern.originLat, pattern.originLng, pattern.destLat, pattern.destLng),
      ]);

      setOriginAddress(originAddr);
      setDestAddress(destAddr);
      setRoutingData(routing);
      setSelectedMode(routing.recommended || 'driving');
    } catch (error) {
      console.error('Error loading route data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    const url = getGoogleMapsUrl(pattern.destLat, pattern.destLng, selectedMode);
    Linking.openURL(url);
  };

  const formatHour = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (!pattern) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No route data available</Text>
      </View>
    );
  }

  const modes = ['driving', 'transit', 'walking'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Route card */}
        <View style={styles.card}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Velaris detected your pattern</Text>
          </View>

          {/* Origin → Destination */}
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={styles.dotOrigin} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>FROM</Text>
                {loading ? (
                  <View style={styles.skeletonText} />
                ) : (
                  <Text style={styles.routeAddress}>{originAddress}</Text>
                )}
                <Text style={styles.routeCoord}>
                  {pattern.originLat.toFixed(4)}, {pattern.originLng.toFixed(4)}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={styles.dotDest} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>TO</Text>
                {loading ? (
                  <View style={styles.skeletonText} />
                ) : (
                  <Text style={styles.routeAddress}>{destAddress}</Text>
                )}
                <Text style={styles.routeCoord}>
                  {pattern.destLat.toFixed(4)}, {pattern.destLng.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          {/* Pattern stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Ionicons name="repeat-outline" size={18} color={theme.colors.accentPrimary} />
              <Text style={styles.statValue}>{pattern.tripCount}</Text>
              <Text style={styles.statLabel}>Times taken</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Ionicons name="time-outline" size={18} color={theme.colors.accentSecondary} />
              <Text style={styles.statValue}>{formatHour(pattern.avgDepartureHour)}</Text>
              <Text style={styles.statLabel}>Usual time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Ionicons name="trending-up-outline" size={18} color={theme.colors.success} />
              <Text style={styles.statValue}>{Math.round(pattern.confidence * 100)}%</Text>
              <Text style={styles.statLabel}>Confidence</Text>
            </View>
          </View>
        </View>

        {/* Travel modes */}
        <Text style={styles.sectionTitle}>Choose your route</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.accentPrimary} />
            <Text style={styles.loadingText}>Getting routes...</Text>
          </View>
        ) : (
          <View style={styles.modesContainer}>
            {modes.map((mode) => {
              const data = routingData?.[mode];
              const isSelected = selectedMode === mode;
              const isRecommended = routingData?.recommended === mode;

              if (!data) return null;

              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                  onPress={() => setSelectedMode(mode)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modeIconWrap, isSelected && styles.modeIconWrapSelected]}>
                    <Ionicons
                      name={getModeIcon(mode)}
                      size={20}
                      color={isSelected ? theme.colors.textPrimary : theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.modeInfo}>
                    <View style={styles.modeHeader}>
                      <Text style={[styles.modeLabel, isSelected && styles.modeLabelSelected]}>
                        {getModeLabel(mode)}
                      </Text>
                      {isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Best</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modeDuration}>{data.duration}</Text>
                    <Text style={styles.modeDistance}>{data.distance}</Text>
                    {mode === 'transit' && data.transitLine && (
                      <Text style={styles.transitInfo}>
                        {data.vehicleType} {data.transitLine}
                        {data.departureTime ? ` · departs ${data.departureTime}` : ''}
                      </Text>
                    )}
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accentPrimary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Open in Maps button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={openInMaps}
            disabled={loading}
          >
            <Ionicons name="navigate" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.primaryBtnText}>
              Open in Google Maps · {getModeLabel(selectedMode)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '600', color: theme.colors.textPrimary,
  },
  errorText: {
    color: theme.colors.textSecondary, textAlign: 'center', marginTop: 100,
  },
  card: {
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.accentPrimary,
  },
  badgeText: { fontSize: 13, color: theme.colors.accentPrimary, fontWeight: '500' },
  routeContainer: { gap: 0 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dotOrigin: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: theme.colors.accentPrimary, marginTop: 18,
  },
  dotDest: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: theme.colors.accentSecondary, marginTop: 18,
  },
  routeLine: {
    width: 2, height: 20, backgroundColor: theme.colors.border,
    marginLeft: 5, marginVertical: 2,
  },
  routeInfo: { flex: 1, paddingVertical: 8 },
  routeLabel: {
    fontSize: 10, fontWeight: '700', color: theme.colors.textMuted,
    letterSpacing: 1, marginBottom: 2,
  },
  routeAddress: {
    fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2,
  },
  routeCoord: { fontSize: 12, color: theme.colors.textMuted },
  skeletonText: {
    height: 16, width: 160, backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 4, marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  statBlock: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  statValue: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: theme.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm,
  },
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, margin: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md, padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },
  modesContainer: {
    marginHorizontal: theme.spacing.lg, gap: theme.spacing.sm,
  },
  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md, padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.border, gap: 12,
  },
  modeCardSelected: {
    borderColor: theme.colors.accentPrimary,
    backgroundColor: 'rgba(123, 94, 167, 0.08)',
  },
  modeIconWrap: {
    width: 44, height: 44, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  modeIconWrapSelected: {
    backgroundColor: theme.colors.accentPrimary,
  },
  modeInfo: { flex: 1 },
  modeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  modeLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  modeLabelSelected: { color: theme.colors.textPrimary },
  modeDuration: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  modeDistance: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  transitInfo: { fontSize: 12, color: theme.colors.accentSecondary, marginTop: 2 },
  recommendedBadge: {
    backgroundColor: 'rgba(72, 187, 120, 0.15)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  recommendedText: { fontSize: 11, fontWeight: '700', color: theme.colors.success },
  actions: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: theme.colors.accentPrimary,
    paddingVertical: 16, borderRadius: theme.borderRadius.md,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
});