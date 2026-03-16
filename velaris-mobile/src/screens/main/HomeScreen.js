import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../utils/theme';

export function HomeScreen() {
  const { user, userProfile, logOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VELARIS</Text>
      <Text style={styles.welcome}>
        Welcome, {userProfile?.name || user?.email}
      </Text>
      <Text style={styles.sub}>Part 2 complete ✓</Text>
      <Text style={styles.sub}>Auth is working</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logOut}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 8,
    marginBottom: theme.spacing.lg,
  },
  welcome: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: theme.colors.accentPrimary,
    marginBottom: 4,
  },
  logoutBtn: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundTertiary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
});