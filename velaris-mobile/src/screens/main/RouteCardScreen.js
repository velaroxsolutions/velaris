import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

export function RouteCardScreen({ route, navigation }) {
  const pattern = route?.params?.pattern;

  const openInMaps = () => {
    if (!pattern) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pattern.destLat},${pattern.destLng}&travelmode=driving`;
    Linking.openURL(url);
  };

  const openTransit = () => {
    if (!pattern) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pattern.destLat},${pattern.destLng}&travelmode=transit`;
    Linking.openURL(url);
  };

  if (!pattern) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No route data available</Text>
      </View>
    );
  }

  const formatHour = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-down" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Card</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main card */}
      <View style={styles.card}>
        {/* Velaris badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Velaris detected your pattern</Text>
        </View>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={styles.dotOrigin} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>YOUR LOCATION</Text>
              <Text style={styles.routeCoord}>
                {pattern.originLat.toFixed(4)}, {pattern.originLng.toFixed(4)}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={styles.dotDest} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>DESTINATION</Text>
              <Text style={styles.routeCoord}>
                {pattern.destLat.toFixed(4)}, {pattern.destLng.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Ionicons name="repeat-outline" size={20} color={theme.colors.accentPrimary} />
            <Text style={styles.statValue}>{pattern.tripCount}</Text>
            <Text style={styles.statLabel}>Times taken</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Ionicons name="time-outline" size={20} color={theme.colors.accentSecondary} />
            <Text style={styles.statValue}>{formatHour(pattern.avgDepartureHour)}</Text>
            <Text style={styles.statLabel}>Usual time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Ionicons name="trending-up-outline" size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>
              {Math.round(pattern.confidence * 100)}%
            </Text>
            <Text style={styles.statLabel}>Confidence</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={openInMaps}>
          <Ionicons name="car-outline" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.primaryBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={openTransit}>
          <Ionicons name="bus-outline" size={20} color={theme.colors.accentSecondary} />
          <Text style={styles.secondaryBtnText}>Take Transit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  errorText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  card: {
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentPrimary,
  },
  badgeText: {
    fontSize: 13,
    color: theme.colors.accentPrimary,
    fontWeight: '500',
  },
  routeContainer: { gap: 0 },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accentPrimary,
  },
  dotDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accentSecondary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: theme.colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: { flex: 1 },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  routeCoord: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accentSecondary,
  },
});