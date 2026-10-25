import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

export default function LomasLoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (loading) return;

    setError('');

    if (!email.trim() || !password) {
      setError('Ingresá tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      setPassword('');
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 400) {
        setError('Revisá el correo y la contraseña ingresados.');
      } else if (status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (status === 429) {
        setError(
          'Demasiados intentos. Esperá antes de volver a iniciar sesión.'
        );
      } else {
        setError(
          'No se pudo completar el acceso. Revisá la conexión e intentá nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
  style={styles.scroll}
  contentContainerStyle={styles.content}
  keyboardShouldPersistTaps="handled"
>
        <View style={styles.card}>
          <Image
            source={require('../../assets/lomas-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo de Lomas Eveneser"
          />

          <Text style={styles.brand}>LOMAS EVENESER</Text>
          <Text style={styles.title}>Iniciar sesión</Text>

          <Text style={styles.description}>
            Ingresá con tu cuenta autorizada para trabajar con los
            registros de la finca.
          </Text>

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
            accessibilityLabel="Correo electrónico"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!loading}
            accessibilityLabel="Contraseña"
            onSubmitEditing={handleLogin}
          />

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: {
  width: 160,
  height: 160,
  alignSelf: 'center',
  marginBottom: spacing.md,
},
  brand: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.input,
    minHeight: 48,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
  flex: 1,
},
});