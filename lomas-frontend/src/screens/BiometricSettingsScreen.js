import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Feather } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import {
  getBiometricStatus,
  readBiometricDevice,
  registerCurrentDevice,
} from '../services/biometricService';

import { colors, spacing, radius } from '../theme/theme';

export default function BiometricSettingsScreen({ navigation }) {
  const { user, token } = useAuth();

  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState('Biometría');
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function checkDevice() {
      try {
        const status = await getBiometricStatus();

        const device = user?.email
          ? await readBiometricDevice(user.email)
          : null;

        if (!active) return;

        setAvailable(status.available);
        setLabel(status.label);
        setLinked(Boolean(device));

        if (!status.available) {
          setMessage(status.reason);
        }
      } catch {
        if (active) {
          setError(
            'No se pudo comprobar la configuración del dispositivo.'
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    checkDevice();

    return () => {
      active = false;
    };
  }, [user?.email]);

  async function handleRegister() {
    if (busyRef.current || !available || !user || !token) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await registerCurrentDevice({
        user,
        token,
      });

      setLinked(true);
      setLabel(result.label);

      setMessage(
        'Dispositivo vinculado. En tu próximo ingreso podrás elegir biometría o Authenticator.'
      );
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setError(
          'La sesión o la vinculación vencieron. Iniciá sesión nuevamente e intentá otra vez.'
        );
      } else if (status === 429) {
        setError(
          'Demasiados intentos. Esperá antes de volver a intentar.'
        );
      } else {
        setError(
          requestError.response?.data?.message ||
          requestError.message ||
          'No se pudo vincular el dispositivo.'
        );
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!user) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Volver a la pantalla anterior"
          style={styles.backButton}
        >
          <Feather
            name="arrow-left"
            size={28}
            color={colors.primary}
          />
        </Pressable>

        <Text style={styles.brand}>LOMAS EVENESER</Text>

        <View style={styles.headerSpace} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Feather
            name="shield"
            size={44}
            color={colors.primary}
            style={styles.icon}
          />

          <Text style={styles.title}>
            Acceso con biometría
          </Text>

          <Text style={styles.description}>
            Vinculá este teléfono para usar Face ID o huella
            como segundo factor al iniciar sesión.
          </Text>

          <Text style={styles.description}>
            Authenticator seguirá disponible como alternativa.
          </Text>

          {checking ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              {available ? (
                <Text style={styles.status}>
                  {label} disponible
                </Text>
              ) : null}

              {linked ? (
                <Text style={styles.description}>
                  Este teléfono tiene una vinculación guardada
                  para tu cuenta.
                </Text>
              ) : null}

              {available ? (
                <Pressable
                  onPress={handleRegister}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      color={colors.onPrimary}
                    />
                  ) : (
                    <Text style={styles.buttonText}>
                      {linked
                        ? 'Volver a vincular este teléfono'
                        : `Vincular ${label}`}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}

          {message ? (
            <Text
              style={styles.message}
              accessibilityLiveRegion="polite"
            >
              {message}
            </Text>
          ) : null}

          {error ? (
            <Text
              style={styles.error}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpace: {
    width: 48,
  },
  brand: {
    flex: 1,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  status: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    opacity: 0.6,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});