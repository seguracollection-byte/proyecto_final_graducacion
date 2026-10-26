import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import api from '../services/api';
import { rememberEmail } from '../services/rememberedEmails';
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
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });

  return checkUser(response.data);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const restoreSession = useCallback(async () => {
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
        // No borrar la sesión por una caída de red o del servidor.
        setSessionError(
          'No se pudo comprobar tu sesión. Revisá la conexión y reintentá.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  async function signIn(email, password, options = {}) {
    const response = await api.post(
      '/login',
      { email: email.trim(), password },
      { timeout: 15000 }
    );

    const receivedToken = response.data?.token;

    if (
      response.data?.success !== true ||
      typeof receivedToken !== 'string' ||
      !receivedToken
    ) {
      throw new Error('Respuesta de login inválida');
    }

    // Confirmar la cuenta con la ruta protegida.
    const currentUser = await fetchCurrentUser(receivedToken);

    await saveSessionToken(receivedToken);

    // Guardar solo el correo de una cuenta verificada, nunca la contraseña.
    if (options.rememberEmail === true) {
      try {
        await rememberEmail(currentUser.email || email);
      } catch {
        console.warn('No se pudo recordar el correo en este dispositivo.');
      }
    }

    setSessionError('');
    setToken(receivedToken);
    setUser(currentUser);
  }

  async function signOut() {
    // Si falla el almacenamiento, no afirmar que se eliminó.
    await removeSessionToken();

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
        signIn,
        signOut,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}