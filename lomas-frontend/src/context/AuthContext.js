import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import api from '../services/api';
import { rememberEmail } from '../services/rememberedEmails';

import {
  authenticateWithBiometrics,
} from '../services/biometricService';

import {
  saveSessionToken,
  readSessionToken,
  removeSessionToken,
} from '../services/sessionStorage';

const AuthContext = createContext(null);

function checkUser(data) {
  const user = data?.user;

  if (
    data?.success !== true ||
    !Number.isInteger(user?.id) ||
    user.id <= 0 ||
    !['usuario', 'administrador'].includes(user.rol)
  ) {
    throw new Error('Respuesta de sesión inválida');
  }

  return user;
}

async function fetchCurrentUser(token) {
  const response = await api.get('/sesion/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 15000,
  });

  return checkUser(response.data);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [pendingMfa, setPendingMfa] = useState(null);

  const pendingRef = useRef(null);
  const verifiedRef = useRef(null);
  const attemptRef = useRef(0);

  const cancelMfa = useCallback(() => {
    attemptRef.current += 1;
    pendingRef.current = null;
    verifiedRef.current = null;
    setPendingMfa(null);
  }, []);

  const restoreSession = useCallback(async () => {
    cancelMfa();

    setLoading(true);
    setSessionError('');
    setUser(null);
    setToken(null);

    try {
      const storedToken = await readSessionToken();

      if (!storedToken) return;

      const currentUser = await fetchCurrentUser(storedToken);

      setToken(storedToken);
      setUser(currentUser);
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await removeSessionToken();
        } catch {
          setSessionError(
            'No se pudo eliminar la sesión vencida del dispositivo.'
          );
        }
      } else {
        setSessionError(
          'No se pudo comprobar tu sesión. Revisá la conexión y reintentá.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [cancelMfa]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  async function signIn(email, password, options = {}) {
    cancelMfa();

    const attempt = attemptRef.current;

    const response = await api.post(
      '/login',
      {
        email: email.trim(),
        password,
      },
      { timeout: 15000 }
    );

    const data = response.data;

    if (
      response.status !== 202 ||
      data?.success !== true ||
      data.mfaRequired !== true ||
      typeof data.challenge !== 'string' ||
      !/^[a-f0-9]{64}$/.test(data.challenge) ||
      !['configuracion', 'verificacion'].includes(
        data.nextStep
      ) ||
      !Number.isInteger(data.expiresIn) ||
      data.expiresIn <= 0 ||
      data.expiresIn > 300
    ) {
      throw new Error('Respuesta de login inválida');
    }

    if (attempt !== attemptRef.current) {
      throw new Error('Inicio de sesión cancelado');
    }

    const pending = {
      challenge: data.challenge,
      nextStep: data.nextStep,
      expiresAt: Date.now() + data.expiresIn * 1000,
      email: email.trim().toLowerCase(),
      rememberEmail: options.rememberEmail === true,
    };

    pendingRef.current = pending;
    setPendingMfa(pending);
    setSessionError('');

    return { mfaRequired: true };
  }

  function getPendingMfa() {
    const pending = pendingRef.current;

    if (!pending || Date.now() >= pending.expiresAt) {
      cancelMfa();

      throw new Error(
        'La verificación venció. Iniciá sesión nuevamente.'
      );
    }

    return pending;
  }

  async function setupAuthenticator() {
    const pending = getPendingMfa();

    if (pending.nextStep !== 'configuracion') {
      throw new Error(
        'La cuenta ya tiene Authenticator configurado'
      );
    }

    const response = await api.post(
      '/mfa/configurar',
      { challenge: pending.challenge },
      { timeout: 15000 }
    );

    if (pendingRef.current !== pending) {
      throw new Error('Verificación cancelada');
    }

    const data = response.data;

    if (
      data?.success !== true ||
      typeof data.secret !== 'string' ||
      !/^[A-Z2-7]{32}$/.test(data.secret) ||
      typeof data.uri !== 'string' ||
      !data.uri.startsWith('otpauth://totp/')
    ) {
      throw new Error('Respuesta de vinculación inválida');
    }

    return {
      secret: data.secret,
      uri: data.uri,
    };
  }

  function acceptMfaResult(data, pending) {
    if (pendingRef.current !== pending) {
      throw new Error('Verificación cancelada');
    }

    if (
      data?.success !== true ||
      typeof data.token !== 'string' ||
      !data.token ||
      !Array.isArray(data.recoveryCodes) ||
      !data.recoveryCodes.every(
        (value) => (
          typeof value === 'string' &&
          /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/.test(value)
        )
      )
    ) {
      throw new Error('Respuesta de verificación inválida');
    }

    verifiedRef.current = {
      token: data.token,
      pending,
    };

    return {
      recoveryCodes: data.recoveryCodes,
    };
  }

  async function verifyAuthenticator(code) {
    const pending = getPendingMfa();

    const response = await api.post(
      '/mfa/verificar',
      {
        challenge: pending.challenge,
        code,
      },
      { timeout: 15000 }
    );

    return acceptMfaResult(response.data, pending);
  }

  async function verifyRecoveryCode(code) {
    const pending = getPendingMfa();
    if (pending.nextStep !== 'verificacion') throw new Error('Primero configurá Authenticator.');
    const response = await api.post('/mfa/recuperacion', {
      challenge: pending.challenge, code,
    }, { timeout: 15000 });
    return acceptMfaResult(response.data, pending);
  }

  async function verifyBiometrics() {
    const pending = getPendingMfa();

    if (pending.nextStep !== 'verificacion') {
      throw new Error(
        'Primero configurá Authenticator y vinculá el dispositivo.'
      );
    }

    const data = await authenticateWithBiometrics({
      email: pending.email,
      challenge: pending.challenge,
    });

    return acceptMfaResult(data, pending);
  }

  async function completeMfaSignIn() {
    const verified = verifiedRef.current;

    if (
      !verified ||
      pendingRef.current !== verified.pending
    ) {
      throw new Error('Primero completá la verificación');
    }

    const currentUser = await fetchCurrentUser(
      verified.token
    );

    if (verifiedRef.current !== verified) {
      throw new Error('Verificación cancelada');
    }

    await saveSessionToken(verified.token);

    if (verified.pending.rememberEmail) {
      try {
        await rememberEmail(
          currentUser.email || verified.pending.email
        );
      } catch {
        console.warn(
          'No se pudo recordar el correo en este dispositivo.'
        );
      }
    }

    setSessionError('');
    setToken(verified.token);
    setUser(currentUser);
    cancelMfa();
  }

  async function signOut() {
    await removeSessionToken();

    cancelMfa();
    setToken(null);
    setUser(null);
    setSessionError('');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sessionError,
        pendingMfa,
        signIn,
        signOut,
        restoreSession,
        setupAuthenticator,
        verifyAuthenticator,
        verifyBiometrics,
        verifyRecoveryCode,
        completeMfaSignIn,
        cancelMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe usarse dentro de AuthProvider'
    );
  }

  return context;
}