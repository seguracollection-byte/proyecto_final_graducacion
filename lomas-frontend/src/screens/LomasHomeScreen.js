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
      setError('No se pudo cerrar la sesión. Intentá nuevamente.');
    } finally {
      setClosing(false);
    }
  }

  function handleOpenAdmin(event) {
    if (Platform.OS === 'web') {
      event.currentTarget?.blur?.();
    }

    navigation.navigate('AdminAccess');
  }

  // La pantalla puede seguir montada durante la transición al login.
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
        <Text style={styles.title}>Hola, {user.nombre}</Text>

        <Text style={styles.description}>
          {user.rol === 'administrador'
            ? 'Cuenta administradora'
            : 'Cuenta de usuario'}
        </Text>

        {user.rol === 'administrador' ? (
          <Pressable
            onPress={handleOpenAdmin}
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

        {modules.map(([title, description]) => (
          <View key={title} style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.description}>
              {description}
            </Text>
            <Text style={styles.pending}>
              Módulo pendiente
            </Text>
          </View>
        ))}

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
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
