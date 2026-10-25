import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'lomas.accessToken';

let webToken = null;

export async function saveSessionToken(token) {
  if (typeof token !== 'string' || !token) {
    throw new Error('Token de sesión inválido');
  }

  if (Platform.OS === 'web') {
    webToken = token;
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function readSessionToken() {
  if (Platform.OS === 'web') {
    return webToken;
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function removeSessionToken() {
  if (Platform.OS === 'web') {
    webToken = null;
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}