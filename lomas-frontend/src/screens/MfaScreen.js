import React, { useEffect, useRef, useState } from 'react';

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

import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

import {
  getBiometricStatus,
  readBiometricDevice,
} from '../services/biometricService';

export default function MfaScreen() {
  const {
    pendingMfa,
    setupAuthenticator,
    verifyAuthenticator,
    verifyBiometrics,
    verifyRecoveryCode,
    completeMfaSignIn,
    cancelMfa,
  } = useAuth();

  const [usingRecovery, setUsingRecovery] = useState(false);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [savedCodes, setSavedCodes] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometría');

  const busyRef = useRef(false);

  const configuring =
    pendingMfa?.nextStep === 'configuracion';

  useEffect(() => {
    let active = true;

    async function checkBiometrics() {
      setBiometricAvailable(false);

      if (
        !pendingMfa?.email ||
        pendingMfa.nextStep !== 'verificacion'
      ) {
        return;
      }

      try {
        const [status, device] = await Promise.all([
          getBiometricStatus(),
          readBiometricDevice(pendingMfa.email),
        ]);

        if (!active) return;

        setBiometricLabel(status.label);
        setBiometricAvailable(
          status.available && Boolean(device)
        );
      } catch {
        if (active) setBiometricAvailable(false);
      }
    }

    checkBiometrics();

    return () => {
      active = false;
    };
  }, [pendingMfa?.email, pendingMfa?.nextStep]);

  function showError(requestError) {
    const status = requestError.response?.status;

    if (status === 429) {
      setError(
        'Demasiados intentos. Esperá antes de volver a intentar.'
      );
    } else if (status === 400 || status === 401) {
      setError(
        requestError.response?.data?.message ||
        'No se pudo completar la verificación.'
      );
    } else if (!requestError.response && !requestError.request) {
      setError(
        requestError.message ||
        'No se pudo completar la verificación.'
      );
    } else {
      setError(
        'No se pudo completar la operación. Revisá la conexión e intentá nuevamente.'
      );
    }
  }

  async function handleSetup() {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await setupAuthenticator();

      setSecret(result.secret);
      setCode('');
    } catch (requestError) {
      showError(requestError);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function acceptVerification(result) {
    setCode('');
    setSecret('');
    setRecoveryCodes(result.recoveryCodes);

    // En la primera configuración, permite guardar los
    // códigos de recuperación antes de entrar.
    if (result.recoveryCodes.length > 0) {
      setVerified(true);
      return;
    }

    // En los ingresos normales entra directamente a Home.
    try {
      await completeMfaSignIn();
    } catch (requestError) {
      // Conserva la posibilidad de reintentar sin volver
      // a utilizar un código o desafío ya consumido.
      setVerified(true);
      throw requestError;
    }
  }

  async function handleVerify() {
    if (busyRef.current) return;

    if (usingRecovery ? !/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{8}){3})$/i.test(code.trim()) : !/^\d{6}$/.test(code)) {
      setError(usingRecovery ? 'Ingresá un código de recuperación completo.' : 'Ingresá los seis dígitos de Authenticator.');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const result = usingRecovery
        ? await verifyRecoveryCode(code)
        : await verifyAuthenticator(code);
      await acceptVerification(result);
    } catch (requestError) {
      showError(requestError);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleBiometrics() {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await verifyBiometrics();
      await acceptVerification(result);
    } catch (requestError) {
      showError(requestError);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleContinue() {
    if (busyRef.current) return;

    if (recoveryCodes.length > 0 && !savedCodes) {
      setError(
        'Confirmá que guardaste tus códigos de recuperación.'
      );
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      await completeMfaSignIn();
    } catch (requestError) {
      showError(requestError);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function renderButton(label, onPress) {
    return (
      <Pressable
        onPress={onPress}
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
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Pressable>
    );
  }

  if (!pendingMfa) {
    return <View style={styles.screen} />;
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
            {verified
              ? recoveryCodes.length > 0
                ? 'Códigos de recuperación'
                : 'Reintentar ingreso'
              : configuring
                ? 'Configurá Authenticator'
                : 'Verificá tu identidad'}
          </Text>

          {verified ? (
            <>
              {recoveryCodes.length > 0 ? (
                <>
                  <Text style={styles.description}>
                    Guardá estos códigos en un lugar seguro.
                    Cada uno permitirá recuperar el acceso una
                    sola vez si perdés tu autenticador.
                  </Text>

                  <Text style={styles.description}>
                    No se volverán a mostrar al iniciar sesión.
                  </Text>

                  <View style={styles.codesBox}>
                    {recoveryCodes.map((recoveryCode) => (
                      <Text
                        key={recoveryCode}
                        selectable
                        style={styles.recoveryCode}
                      >
                        {recoveryCode}
                      </Text>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => {
                      setSavedCodes(!savedCodes);
                      setError('');
                    }}
                    disabled={busy}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: savedCodes,
                      disabled: busy,
                    }}
                    style={styles.checkboxRow}
                  >
                    <Feather
                      name={savedCodes ? 'check-square' : 'square'}
                      size={20}
                      color={colors.primary}
                    />

                    <Text style={styles.checkboxText}>
                      Ya guardé mis códigos
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.description}>
                  Tu identidad ya fue verificada, pero no
                  se pudo completar el ingreso. Revisá la
                  conexión y reintentá.
                </Text>
              )}
            </>
          ) : (
            <>
              {configuring ? (
                <>
                  <Text style={styles.description}>
                    Abrí Google Authenticator. Tocá el botón
                    para agregar una cuenta y elegí ingresar
                    una clave de configuración.
                  </Text>

                  {!secret ? (
                    renderButton(
                      'Preparar vinculación',
                      handleSetup
                    )
                  ) : (
                    <>
                      <Text style={styles.description}>
                        Usá tu correo como nombre de cuenta,
                        pegá esta clave y elegí el tipo
                        «Basada en tiempo».
                      </Text>

                      <View style={styles.codesBox}>
                        <Text
                          selectable
                          accessibilityLabel="Clave de configuración"
                          style={styles.secret}
                        >
                          {secret}
                        </Text>
                      </View>

                      <Text style={styles.description}>
                        Podés mantener presionada la clave
                        para seleccionarla y copiarla.
                        Después ingresá aquí el código
                        que muestra Authenticator.
                      </Text>
                    </>
                  )}
                </>
              ) : (
                <>
                  {biometricAvailable && !usingRecovery ? (
                    <>
                      <Text style={styles.description}>
                        Elegí cómo completar tu ingreso.
                      </Text>

                      {renderButton(
                        `Usar ${biometricLabel}`,
                        handleBiometrics
                      )}

                      <Text style={styles.alternative}>
                        O usá tu código de Authenticator
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.description}>
                      {usingRecovery
                        ? 'Usá uno de los códigos que guardaste al configurar tu cuenta. Cada código funciona una sola vez y no reemplaza tu contraseña.'
                        : 'Abrí Authenticator e ingresá el código de seis dígitos de tu cuenta de Lomas Eveneser.'}
                    </Text>
                  )}
                </>
              )}

              {!configuring || secret ? (
                <>
                  <Text style={styles.label}>
                    {usingRecovery ? 'Código de recuperación' : 'Código de Authenticator'}
                  </Text>

                  <TextInput
                    value={code}
                    onChangeText={(value) => {
                      setCode(
                        usingRecovery ? value.slice(0, 64) : value.replace(/\D/g, '').slice(0, 6)
                      );
                      setError('');
                    }}
                    style={[styles.input, usingRecovery && { fontSize: 15, letterSpacing: 0 }]}
                    keyboardType={usingRecovery ? 'default' : 'number-pad'}
                    autoComplete={usingRecovery ? 'off' : 'one-time-code'}
                    textContentType={usingRecovery ? 'none' : 'oneTimeCode'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={usingRecovery ? 64 : 6}
                    editable={!busy}
                    accessibilityLabel={usingRecovery ? 'Código de recuperación' : 'Código de seis dígitos'}
                    onSubmitEditing={handleVerify}
                  />

                  {renderButton(
                    'Verificar código',
                    handleVerify
                  )}
                </>
              ) : null}
            </>
          )}

          {!verified && !configuring ? (
            <Pressable disabled={busy} accessibilityRole="button" style={styles.linkButton}
              onPress={() => { setUsingRecovery(!usingRecovery); setCode(''); setError(''); }}>
              <Text style={styles.link}>{usingRecovery ? 'Usar Authenticator o biometría' : 'Usar un código de recuperación'}</Text>
            </Pressable>
          ) : null}

          {error ? (
            <Text
              style={styles.error}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}

          {verified
            ? renderButton(
                recoveryCodes.length > 0
                  ? 'Entrar a Lomas'
                  : 'Reintentar ingreso',
                handleContinue
              )
            : null}

          <Pressable
            onPress={() => {
              if (!busyRef.current) cancelMfa();
            }}
            disabled={busy}
            accessibilityRole="button"
            style={styles.linkButton}
          >
            <Text style={styles.link}>
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
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
  alternative: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 52,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 5,
  },
  codesBox: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  secret: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  recoveryCode: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 28,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkboxText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
  error: {
    color: colors.error,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  linkButton: {
    minHeight: 48,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});