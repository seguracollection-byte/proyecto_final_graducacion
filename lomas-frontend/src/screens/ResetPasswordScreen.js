import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import api from '../services/api';
import { colors, spacing, radius } from '../theme/theme';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordScreen({ route, navigation }) {
  const token = route?.params?.token;
  const validToken =
    typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const sending = useRef(false);

  async function handleReset() {
    if (sending.current) return;

    setError('');

    if (!validToken) {
      setError('Abrí el enlace de recuperación enviado a tu correo.');
      return;
    }

    if (Array.from(password).length < 12) {
      setError('Usá como mínimo 12 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    sending.current = true;
    setLoading(true);

    try {
      const response = await api.post(
        '/restablecer-password',
        {
          token,
          password,
          passwordConfirm: confirmation,
        },
        { timeout: 15000 }
      );

      if (
        response.status !== 200 ||
        response.data?.success !== true
      ) {
        throw new Error('Respuesta inesperada');
      }

      setPassword('');
      setConfirmation('');
      setCompleted(true);
    } catch (requestError) {
      const status = requestError.response?.status;
      const data = requestError.response?.data;

      if (status === 400) {
        setError(
          data?.message ||
          data?.errors?.[0]?.mensaje ||
          'Revisá los datos ingresados.'
        );
      } else if (status === 429) {
        setError('Demasiados intentos. Esperá antes de reintentar.');
      } else {
        setError(
          'No se pudo confirmar el cambio. Intentá iniciar sesión con la contraseña nueva antes de solicitar otro enlace.'
        );
      }
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  function goToLogin(event) {
    if (Platform.OS === 'web') {
      event?.currentTarget?.blur?.();
    }

    navigation.replace('Login');
  }

  function requestNewLink(event) {
    if (Platform.OS === 'web') {
      event?.currentTarget?.blur?.();
    }

    navigation.replace('ForgotPassword');
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
          <Text style={styles.brand}>LOMAS EVENESER</Text>

          <Text style={styles.title}>
            {completed ? 'Contraseña actualizada' : 'Nueva contraseña'}
          </Text>

          {completed ? (
            <Text style={styles.description}>
              Tu contraseña fue actualizada y las sesiones anteriores
              quedaron invalidadas. Iniciá sesión con la contraseña nueva.
            </Text>
          ) : !validToken ? (
            <Text style={styles.error} accessibilityRole="alert">
              Abrí el enlace de recuperación enviado a tu correo.
              Si venció o ya fue utilizado, solicitá uno nuevo.
            </Text>
          ) : (
            <>
                            <Text style={styles.description}>
                Elegí una contraseña.
                {'\n'}
                Como mínimo usá 12 caracteres.
                {'\n'}
                Usá mayúsculas, minúsculas, números y símbolos
                para mayor seguridad.
              </Text>

              <Text style={styles.label}>Contraseña nueva</Text>
              <PasswordInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={!loading}
                accessibilityLabel="Contraseña nueva"
              />

              <Text style={styles.label}>Repetir contraseña</Text>
              <PasswordInput
                style={styles.input}
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={!loading}
                accessibilityLabel="Repetir contraseña"
                onSubmitEditing={handleReset}
              />

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={handleReset}
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
                  <Text style={styles.buttonText}>
                    Guardar contraseña
                  </Text>
                )}
              </Pressable>
            </>
          )}

          {!completed ? (
            <Pressable
              onPress={requestNewLink}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Solicitar otro enlace</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={goToLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Ir a iniciar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
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
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  linkButton: {
    minHeight: 48,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});