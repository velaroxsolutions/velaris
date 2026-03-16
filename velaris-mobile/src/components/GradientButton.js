import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { theme } from '../utils/theme';

export function GradientButton({ title, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.wrapper, disabled && styles.disabled, style]}
    >
      <View style={styles.gradient}>
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  gradient: {
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});