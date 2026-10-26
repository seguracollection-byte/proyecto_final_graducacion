import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

export default function PendingActivationsScreen({ navigation }) {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const sending = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const controller = new AbortController();

      async function load() {
        setLoading(true);
        setError('');
        setRequests([]);
        setSelectedId(null);

        try {
          if (user?.rol !== 'administrador' || !token) {
            throw new Error('Sesión administradora requerida');
          }

          const response = await api.get(
            '/admin/activaciones-pendientes',
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
              timeout: 15000,
            }
          );

          if (
            response.data?.success !== true ||
            !Array.isArray(response.data.solicitudes)
          ) {
            throw new Error('Respuesta inesperada');
          }

          if (active) {
            setRequests(response.data.solicitudes);
            setNeedsRefresh(false);
          }
        } catch (requestError) {
          if (!active) return;

          const status = requestError.response?.status;

          setError(
            status === 401
              ? 'Tu sesión venció. Volvé a iniciar sesión.'
              : status === 403
                ? 'No tenés permiso para consultar este listado.'
                : 'No se pudo cargar el listado. Intentá actualizarlo.'
          );
          setNeedsRefresh(true);
        } finally {
          if (active) setLoading(false);
        }
      }

      load();

      return () => {
        active = false;
        controller.abort();
      };
    }, [user?.rol, token, refresh])
  );

  async function handleResend(request) {
    if (sending.current || needsRefresh) return;

    sending.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await api.post(
        `/admin/solicitudes/${request.id}/reenviar-activacion`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );

      if (response.data?.success !== true) {
        throw new Error('Respuesta inesperada');
      }

      setNotice(
        response.data.correoAceptado === true
          ? 'El servidor de correo aceptó el nuevo enlace. Los enlaces anteriores quedaron invalidados.'
          : 'El enlace fue renovado, pero no se pudo confirmar el envío. Revisá el correo antes de volver a intentar.'
      );
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setError('Tu sesión venció. Volvé a iniciar sesión.');
      } else if (status === 403) {
        setError('No tenés permiso para reenviar activaciones.');
      } else if (status === 409) {
        setError(
          'Esta cuenta ya no admite reenvío. Actualizá el listado.'
        );
      } else if (status === 429) {
        setError(
          'Alcanzaste el límite de envíos. Esperá antes de reintentar.'
        );
      } else {
        setError(
          'No se pudo confirmar el reenvío. Revisá el correo y actualizá el listado antes de reintentar.'
        );
      }

      setNeedsRefresh(true);
    } finally {
      setSelectedId(null);
      sending.current = false;
      setBusy(false);
    }
  }

  function handleBack(event) {
    if (sending.current) return;

    if (Platform.OS === 'web') {
      event?.currentTarget?.blur?.();
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.back}
        >
          <Feather name="arrow-left" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.brand}>LOMAS EVENESER</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Activaciones pendientes</Text>

          <Text style={styles.description}>
            Cuentas aprobadas que todavía no han establecido
            su contraseña.
          </Text>

          <Pressable
            disabled={busy || loading}
            onPress={() => {
              setNotice('');
              setRefresh((value) => value + 1);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (busy || loading) && styles.faded,
            ]}
          >
            <Text style={styles.buttonText}>Actualizar listado</Text>
          </Pressable>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={styles.message}
            />
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {notice ? (
            <Text style={styles.description} accessibilityRole="alert">
              {notice}
            </Text>
          ) : null}

          {!loading && !error && requests.length === 0 ? (
            <Text style={styles.description}>
              No hay cuentas pendientes de activación.
            </Text>
          ) : null}

          {requests.map((request) => (
            <View key={request.id} style={styles.card}>
              <Text style={styles.name}>{request.nombre}</Text>
              <Text style={styles.description}>{request.email}</Text>

              {selectedId === request.id ? (
                <>
                  <Text style={styles.description}>
                    ¿Enviar un nuevo enlace de activación a este
                    correo? Los enlaces anteriores dejarán de funcionar.
                  </Text>

                  <Pressable
                    disabled={busy || needsRefresh}
                    onPress={() => handleResend(request)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (busy || loading || needsRefresh) && styles.faded,
            ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.buttonText}>
                        Confirmar reenvío
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={busy}
                    onPress={() => setSelectedId(null)}
                    accessibilityRole="button"
                    style={styles.link}
                  >
                    <Text style={styles.linkText}>Cancelar</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  disabled={busy || loading || needsRefresh}
                  onPress={() => {
                    setError('');
                    setNotice('');
                    setSelectedId(request.id);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (busy || loading || needsRefresh) && styles.faded,
            ]}
                >
                  <Text style={styles.buttonText}>
                    Reenviar activación
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
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
  scroll: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: 56,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: 900 },
  title: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  description: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: spacing.md,
  },
  name: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  card: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  linkText: {
    textAlign: 'center', color: colors.primary, fontSize: 16 },
  error: {
    textAlign: 'center',
    color: colors.error,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: spacing.md,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  faded: { opacity: 0.5 },
  message: { marginVertical: spacing.lg },
});