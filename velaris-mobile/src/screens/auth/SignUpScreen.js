import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { GradientButton } from '../../components/GradientButton';
import { InputField } from '../../components/InputField';
import { theme } from '../../utils/theme';

export function SignUpScreen({ navigation }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!username.trim()) e.username = 'Username is required';
    if (username.includes(' ')) e.username = 'No spaces in username';
    if (!email.trim()) e.email = 'Email is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim(), username.trim().toLowerCase());
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
      };
      Alert.alert('Sign Up Failed', messages[error.code] || 'Something went wrong. Try again.');
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            One account. All Velarox apps.
          </Text>

          <InputField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Thevindu Nagasinghe"
            autoCapitalize="words"
            error={errors.name}
          />
          <InputField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="nagasing"
            error={errors.username}
          />
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
            placeholder="Min. 6 characters"
            secureTextEntry
            error={errors.password}
          />

          <GradientButton
            title={loading ? 'Creating account...' : 'Create Account'}
            onPress={handleSignUp}
            disabled={loading}
            style={styles.btn}
          />

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>
              Already have an account?{' '}
              <Text style={styles.link}>Sign in</Text>
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
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backText: { color: theme.colors.textSecondary, fontSize: 14 },
  link: { color: theme.colors.accentSecondary, fontWeight: '600' },
});