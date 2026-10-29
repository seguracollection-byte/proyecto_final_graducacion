import {
  Platform,
  TurboModuleRegistry,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

function getNativeBiometrics() {
  if (!['android', 'ios'].includes(Platform.OS)) {
    return null;
  }

  if (!TurboModuleRegistry.get('ReactNativeBiometrics')) {
    return null;
  }

  return require('@sbaiahmed1/react-native-biometrics');
}

function storageKey(email) {
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    email.length > 254
  ) {
    throw new Error('Correo de dispositivo inválido');
  }

  return `lomas.biometricDevice.v1:${email.trim().toLowerCase()}`;
}

export async function getBiometricStatus() {
  const biometrics = getNativeBiometrics();

  if (!biometrics) {
    return {
      available: false,
      label: 'Biometría',
      reason:
        'Esta versión de la aplicación no incluye el módulo biométrico.',
    };
  }

  try {
    const result = await biometrics.isSensorAvailable({
      biometricStrength: 'strong',
    });

    return {
      available: result.available === true,
      label:
        result.biometryType === 'FaceID'
          ? 'Face ID'
          : result.biometryType === 'TouchID'
            ? 'Touch ID'
            : 'Huella o biometría',
      reason:
        result.available === true
          ? ''
          : 'Configurá una biometría compatible en este dispositivo.',
    };
  } catch {
    return {
      available: false,
      label: 'Biometría',
      reason:
        'No se pudo comprobar la biometría del dispositivo.',
    };
  }
}

export async function readBiometricDevice(email) {
  const raw = await AsyncStorage.getItem(storageKey(email));

  if (!raw) return null;

  const device = JSON.parse(raw);

  if (
    typeof device?.deviceId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      device.deviceId
    ) ||
    typeof device.keyAlias !== 'string' ||
    !/^lomas_[a-zA-Z0-9_]+$/.test(device.keyAlias)
  ) {
    throw new Error('Vinculación local inválida');
  }

  return device;
}

async function signChallenge(keyAlias, message) {
  const biometrics = getNativeBiometrics();

  if (!biometrics) {
    throw new Error(
      'La aplicación necesita incluir el módulo biométrico.'
    );
  }

  if (
    typeof message !== 'string' ||
    message.length === 0 ||
    message.length > 1024
  ) {
    throw new Error('Desafío biométrico inválido');
  }

  const result = await biometrics.signWithOptions({
    keyAlias,
    data: message,
    inputEncoding: 'utf8',
    promptTitle: 'Verificá tu identidad',
    promptSubtitle: 'Acceso a Lomas Eveneser',
    cancelButtonText: 'Cancelar',
    biometricStrength: 'strong',
    disableDeviceFallback: true,
    returnAuthType: true,
  });

  if (
    result.success !== true ||
    typeof result.signature !== 'string' ||
    !result.signature ||
    result.authType === 1
  ) {
    throw new Error(
      'La verificación biométrica fue cancelada o no pudo completarse.'
    );
  }

  return result.signature;
}

export async function registerCurrentDevice({ user, token }) {
  if (
    !Number.isInteger(user?.id) ||
    user.id <= 0 ||
    typeof token !== 'string' ||
    !token
  ) {
    throw new Error('Primero iniciá sesión.');
  }

  const status = await getBiometricStatus();

  if (!status.available) {
    throw new Error(status.reason);
  }

  const biometrics = getNativeBiometrics();

  // Es un identificador público, no una clave de seguridad.
  const keyAlias = [
    'lomas',
    user.id,
    Date.now(),
    Math.random().toString(36).slice(2, 10),
  ].join('_');

  let created = false;

  try {
    const keys = await biometrics.createKeys(
      keyAlias,
      'rsa2048',
      'strong',
      false,
      true
    );

    created = true;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const registration = await api.post(
      '/biometria/dispositivos/registrar',
      {
        publicKey: keys.publicKey,
        name: Platform.OS === 'ios'
          ? 'Mi iPhone'
          : 'Mi Android',
        platform: Platform.OS,
      },
      { headers, timeout: 15000 }
    );

    const data = registration.data;

    if (
      data?.success !== true ||
      typeof data.deviceId !== 'string' ||
      typeof data.challenge !== 'string' ||
      typeof data.message !== 'string'
    ) {
      throw new Error('Respuesta de vinculación inválida');
    }

    const signature = await signChallenge(
      keyAlias,
      data.message
    );

    const confirmation = await api.post(
      '/biometria/dispositivos/confirmar',
      {
        challenge: data.challenge,
        signature,
      },
      { headers, timeout: 15000 }
    );

    if (
      confirmation.data?.success !== true ||
      confirmation.data.deviceId !== data.deviceId
    ) {
      throw new Error('No se pudo confirmar el dispositivo');
    }

    await AsyncStorage.setItem(
      storageKey(user.email),
      JSON.stringify({
        deviceId: data.deviceId,
        keyAlias,
      })
    );

    return { label: status.label };
  } catch (error) {
    if (created) {
      try {
        await biometrics.deleteKeys(keyAlias);
      } catch {
        // No reemplaza el error original.
      }
    }

    throw error;
  }
}

export async function authenticateWithBiometrics({
  email,
  challenge,
}) {
  const device = await readBiometricDevice(email);

  if (!device) {
    throw new Error(
      'Primero vinculá este dispositivo desde tu cuenta.'
    );
  }

  const status = await getBiometricStatus();

  if (!status.available) {
    throw new Error(status.reason);
  }

  const response = await api.post(
    '/biometria/ingreso/desafio',
    {
      challenge,
      deviceId: device.deviceId,
    },
    { timeout: 15000 }
  );

  const data = response.data;

  if (
    data?.success !== true ||
    typeof data.challenge !== 'string' ||
    typeof data.message !== 'string'
  ) {
    throw new Error('Respuesta de desafío inválida');
  }

  const signature = await signChallenge(
    device.keyAlias,
    data.message
  );

  const verification = await api.post(
    '/biometria/ingreso/verificar',
    {
      challenge: data.challenge,
      signature,
    },
    { timeout: 15000 }
  );

  return verification.data;
}