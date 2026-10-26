import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lomas.rememberedEmails.v1';

function normalize(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export async function readRememberedEmails() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const values = JSON.parse(raw);
  if (!Array.isArray(values)) throw new Error('Lista de correos inválida');
  return [...new Set(values.map(normalize).filter((email) =>
    email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ))];
}

export async function rememberEmail(email) {
  const normalized = normalize(email);
  if (!normalized || normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Correo inválido');
  }
  const previous = await readRememberedEmails();
  await AsyncStorage.setItem(KEY, JSON.stringify([
    normalized, ...previous.filter((value) => value !== normalized),
  ]));
}

export async function clearRememberedEmails() {
  await AsyncStorage.removeItem(KEY);
}
