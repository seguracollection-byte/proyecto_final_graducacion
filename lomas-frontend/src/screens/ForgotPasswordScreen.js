import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import api from '../services/api';
import { colors, spacing, radius } from '../theme/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const sending = useRef(false);

  async function handleSubmit() {
    if (sending.current) return;

    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError('Ingresá un correo válido.');
      return;
    }

    sending.current = true;
    setLoading(true);

    try {
      const response = await api.post(
        '/recuperar-password',
        { email: normalizedEmail },
        { timeout: 30000 }
      );

      if (
        response.status !== 202 ||
        response.data?.success !== true
      ) {
        throw new Error('Respuesta inesperada');
      }

      setEmail('');
      setCompleted(true);
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 400) {
        setError(
          requestError.response?.data?.errors?.[0]?.mensaje ||
          'Ingresá un correo válido.'
        );
      } else if (status === 429) {
        setError(
          'Demasiadas solicitudes. Esperá antes de volver a intentarlo.'
        );
      } else if (status === 503) {
        setError(
          'La recuperación no está disponible en este momento. Intentá más tarde.'
        );
      } else {
        setError(
          'No se pudo confirmar la solicitud. Revisá tu correo antes de intentarlo nuevamente.'
        );
      }
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  function handleBack(event) {
    if (Platform.OS === 'web') {
      event?.currentTarget?.blur?.();
    }

    navigation.navigate('Login');
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
            {completed ? 'Revisá tu correo' : 'Recuperar contraseña'}
          </Text>

          {completed ? (
            <Text style={styles.description}>
              Si el correo corresponde a una cuenta activa,
              recibirás un enlace para restablecer tu contraseña.
              Revisá también la carpeta de correo no deseado.
              {'\n\n'}
              El enlace vence en 15 minutos y solo puede
              utilizarse una vez.
            </Text>
          ) : (
            <>
              <Text style={styles.description}>
                Ingresá el correo de tu cuenta para solicitar
                un enlace de recuperación.
              </Text>

              <Text style={styles.label}>Correo electrónico</Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
                accessibilityLabel="Correo electrónico"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />

              {error ? (
                <Text
                  style={styles.error}
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={handleSubmit}
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
                    Enviar enlace
                  </Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={handleBack}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              Volver a iniciar sesión
            </Text>
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
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  backButton: {
    minHeight: 48,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});