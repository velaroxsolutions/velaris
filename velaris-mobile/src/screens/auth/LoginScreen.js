import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { GradientButton } from '../../components/GradientButton';
import { InputField } from '../../components/InputField';
import { theme } from '../../utils/theme';

export function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      const messages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/invalid-credential': 'Invalid email or password',
      };
      Alert.alert('Login Failed', messages[error.code] || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>VELARIS</Text>
          <Text style={styles.tagline}>by Velarox</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in with your Velarox account
          </Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={errors.password}
          />

          <GradientButton
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            style={styles.btn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.secondaryText}>
              New to Velarox?{' '}
              <Text style={styles.link}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 13,
    color: theme.colors.accentPrimary,
    marginTop: 4,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  btn: { marginTop: theme.spacing.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: {
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.sm,
    fontSize: 13,
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: theme.colors.textSecondary, fontSize: 14 },
  link: { color: theme.colors.accentSecondary, fontWeight: '600' },
});