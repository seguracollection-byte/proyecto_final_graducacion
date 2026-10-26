import React, { useState } from 'react';
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

export default function RequestAccessScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    setError('');

    if (
      nombre.trim().length < 2 ||
      nombre.trim().length > 120
    ) {
      setError('Ingresá un nombre de entre 2 y 120 caracteres.');
      return;
    }

    if (
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError('Ingresá un correo válido.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/solicitudes-acceso',
        {
          nombre: nombre.trim(),
          email: email.trim(),
        },
        { timeout: 15000 }
      );

      if (response.data?.success !== true) {
        throw new Error('Respuesta inesperada');
      }

      setNombre('');
      setEmail('');
      setCompleted(true);
    } catch (requestError) {
      const status = requestError.response?.status;
      const data = requestError.response?.data;

      if (status === 400) {
        setError(
          data?.errors?.[0]?.mensaje ||
          'Revisá el nombre y el correo.'
        );
      } else if (status === 429) {
        setError(
          'Demasiados intentos. Esperá antes de volver a solicitar acceso.'
        );
      } else {
        setError(
          'No se pudo confirmar la solicitud. Revisá la conexión e intentá más tarde.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin(event) {
    if (Platform.OS === 'web') {
      event.currentTarget?.blur?.();
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
            {completed ? 'Solicitud recibida' : 'Crear cuenta'}
          </Text>

          {completed ? (
            <Text style={styles.description}>
              Si corresponde, un administrador revisará tu
              solicitud. Si se aprueba, recibirás un correo
              para establecer tu contraseña y activar la cuenta.
            </Text>
          ) : (
            <>
              <Text style={styles.description}>
                Solicitá acceso a Lomas Eveneser. Enviar este
                formulario no habilita una cuenta automáticamente.
              </Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                maxLength={120}
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
                accessibilityLabel="Nombre"
              />

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
                    Solicitar acceso
                  </Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={handleBackToLogin}
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
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  label: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  input: {
    textAlign: 'center',
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
    textAlign: 'center',
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
    textAlign: 'center',
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