import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, radius } from '../theme/theme';

export default function AccountSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  function navigate(event, screen) {
    if (Platform.OS === 'web') event?.currentTarget?.blur?.();
    navigation.navigate(screen);
  }
  async function requestRecovery() {
    if (busyRef.current || !user) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await api.post('/recuperar-password', { email: user.email }, { timeout: 15000 });
      setMessage('Si tu cuenta está activa, recibirás un enlace para cambiar tu contraseña. Revisá también el correo no deseado.');
      setConfirming(false);
    } catch (requestError) {
      setError(requestError.response?.status === 429
        ? 'Demasiados intentos. Esperá antes de solicitar otro enlace.'
        : 'No se pudo solicitar el enlace. Revisá tu conexión e intentá nuevamente.');
    } finally { busyRef.current = false; setBusy(false); }
  }
  if (!user) return <View style={styles.screen} />;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Volver a la pantalla anterior" style={styles.back}>
          <Feather name="arrow-left" size={25} color={colors.primary} />
        </Pressable>
        <Text style={styles.brand}>LOMAS EVENESER</Text>
        <View style={styles.back} />
      </View>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.container}>
          <Text style={styles.title}>Mi cuenta</Text>
          <Text style={styles.description}>Tus datos y opciones de seguridad</Text>
          <View style={styles.card}>
            <Feather name="user" size={28} color={colors.primary} style={styles.icon} />
            <Text style={styles.name}>{user.nombre}</Text>
            <Text selectable style={styles.description}>{user.email}</Text>
            <Text style={styles.badge}>{user.rol === 'administrador' ? 'Administrador' : 'Usuario'}</Text>
          </View>
          <Text style={styles.section}>Seguridad de mi cuenta</Text>
          <Pressable onPress={(event) => navigate(event, 'BiometricSettings')} accessibilityRole="button" style={styles.row}>
            <Feather name="shield" size={23} color={colors.primary} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Acceso con biometría</Text>
              <Text style={styles.caption}>Configurá Face ID o huella en un dispositivo compatible.</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
          <Pressable disabled={busy} onPress={() => { setConfirming(!confirming); setMessage(''); setError(''); }} accessibilityRole="button" style={styles.row}>
            <Feather name="lock" size={23} color={colors.primary} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Cambiar contraseña</Text>
              <Text style={styles.caption}>Recibí un enlace en tu correo.</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
          {confirming ? <View style={styles.card}>
            <Text style={styles.description}>¿Enviar un enlace a {user.email} para cambiar tu contraseña?</Text>
            <Pressable disabled={busy} onPress={requestRecovery} accessibilityRole="button" style={styles.button}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Enviar enlace</Text>}
            </Pressable>
            <Pressable disabled={busy} onPress={() => setConfirming(false)} accessibilityRole="button" style={styles.cancel}><Text style={styles.badge}>Cancelar</Text></Pressable>
          </View> : null}
          {message ? <Text accessibilityRole="alert" style={[styles.description, { color: colors.success }]}>{message}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={[styles.description, { color: colors.error }]}>{error}</Text> : null}
          <View style={styles.note}>
            <Feather name="key" size={20} color={colors.primary} style={styles.icon} />
            <Text style={styles.caption}>¿No tenés acceso a tu autenticador? Al iniciar sesión podés usar uno de tus códigos de recuperación guardados.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, color: colors.primary, fontWeight: '700', textAlign: 'center', fontSize: 16 },
  content: { flexGrow: 1, alignItems: 'center', padding: spacing.lg },
  container: { width: '100%', maxWidth: 600 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: spacing.md },
  card: { padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, marginVertical: spacing.md },
  icon: { alignSelf: 'center', marginBottom: spacing.md },
  name: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  badge: { color: colors.primary, fontSize: 14, textAlign: 'center' },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, backgroundColor: colors.surface, marginBottom: spacing.md },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  caption: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  note: { padding: spacing.md, marginTop: spacing.md },
  button: { minHeight: 48, padding: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, backgroundColor: colors.primary },
  buttonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
});
