import React, { useState } from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

const modules = [
  ['Producción de leche', 'Registro de mañana y tarde en kilogramos.'],
  ['Ventas de leche', 'Entregas a Dos Pinos y precio de cada venta.'],
  ['Nacimientos', 'Identificación, fecha de nacimiento y sexo.'],
  ['Ganado y pesajes', 'Animales e historial de sus mediciones.'],
  ['Medicamentos comprados', 'Compras, vencimientos y avisos.'],
  ['Aplicaciones y vacunación', 'Tratamientos individuales y grupales.'],
];

export default function LomasHomeScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOut() {
    if (closing) return;

    setClosing(true);
    setError('');

    try {
      await signOut();
    } catch {
      setError(
        'No se pudo cerrar la sesión. Intentá nuevamente.'
      );
    } finally {
      setClosing(false);
    }
  }

  function openScreen(event, screen) {
    if (Platform.OS === 'web') {
      event?.currentTarget?.blur?.();
    }

    navigation.navigate(screen);
  }

  // Evita leer una cuenta eliminada durante el cierre de sesión.
  if (!user) {
    return <View style={styles.screen} />;
  }

  return (
    <ScrollView
      testID="home-scroll"
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.container}>
        <Text style={styles.brand}>LOMAS EVENESER</Text>

        <View style={styles.profileRow}>
          <View style={styles.gearSpacer} />
          <View style={styles.profileText}>
            <Text style={styles.title}>Hola, {user.nombre}</Text>
            <Text style={styles.description}>
              {user.rol === 'administrador' ? 'Cuenta administradora' : 'Cuenta de usuario'}
            </Text>
          </View>
          <Pressable
            onPress={(event) => openScreen(event, 'AccountSettings')}
            disabled={closing}
            accessibilityRole="button"
            accessibilityLabel="Ajustes y seguridad de mi cuenta"
            style={({ pressed }) => [styles.gear, pressed && { opacity: 0.65 }]}
          >
            <Feather name="settings" size={23} color={colors.primary} />
          </Pressable>
        </View>

        {user.rol === 'administrador' ? (
          <Pressable
            onPress={(event) => openScreen(
              event,
              'AdminAccess'
            )}
            disabled={closing}
            accessibilityRole="button"
            accessibilityLabel="Administrar solicitudes de acceso"
            accessibilityState={{ disabled: closing }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              Administración de acceso
            </Text>

            <Text style={styles.description}>
              Revisá las solicitudes pendientes.
            </Text>

            <Text style={styles.pending}>
              Ver solicitudes
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>
          Registros de la finca
        </Text>

        <View style={styles.modules}>
        {modules.map(([title, description], index) => (
          <View key={title} style={[styles.card, styles.moduleCard]}>
            <View style={styles.moduleIcon}>
              <Feather name={['droplet', 'dollar-sign', 'sun', 'activity', 'package', 'shield'][index]} size={24} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>
              {title}
            </Text>

            <Text style={styles.description}>
              {description}
            </Text>

            <Text style={styles.pending}>
              Módulo pendiente
            </Text>
          </View>
        ))}
        </View>

        {error ? (
          <Text
            style={styles.error}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSignOut}
          disabled={closing}
          accessibilityRole="button"
          accessibilityState={{ disabled: closing }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            closing && styles.buttonDisabled,
          ]}
        >
          {closing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              Cerrar sesión
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 900,
  },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  profileText: { flex: 1, minWidth: 0 },
  gearSpacer: { width: 44 },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.button, backgroundColor: colors.surface },
  modules: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  moduleCard: { flexGrow: 1, flexBasis: 300, maxWidth: '100%', marginBottom: 0, justifyContent: 'center' },
  moduleIcon: { alignSelf: 'center', marginBottom: spacing.md },
  brand: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginVertical: spacing.md,
  },
  card: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  pending: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
  },
  error: {
    textAlign: 'center',
    color: colors.error,
    marginVertical: spacing.md,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    marginVertical: spacing.md,
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
});