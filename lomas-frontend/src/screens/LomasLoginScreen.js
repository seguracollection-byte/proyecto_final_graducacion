import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';
import PasswordInput from '../components/PasswordInput';
import { Feather } from '@expo/vector-icons';
import {
    readRememberedEmails,
    clearRememberedEmails,
} from '../services/rememberedEmails';

export default function LomasLoginScreen({ navigation }) {
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [remember, setRemember] = useState(false);
    const [savedEmails, setSavedEmails] = useState([]);
    const [preferencesReady, setPreferencesReady] = useState(false);
    const [preferencesBusy, setPreferencesBusy] = useState(false);
    const [storageError, setStorageError] = useState('');

    useEffect(() => {
        let active = true;
        readRememberedEmails().then((emails) => {
            if (!active) return;
            setSavedEmails(emails);
            setRemember(emails.length > 0);
            setEmail(emails[0] || '');
            setPreferencesReady(true);
        }).catch(() => {
            if (active) setStorageError('No se pudieron cargar los correos recordados.');
        });
        return () => { active = false; };
    }, []);

    async function toggleRemember() {
        if (loading || preferencesBusy || !preferencesReady) return;
        if (!remember) {
            setRemember(true);
            return;
        }
        setPreferencesBusy(true);
        setStorageError('');
        try {
            await clearRememberedEmails();
            setSavedEmails([]);
            setRemember(false);
        } catch {
            setStorageError('No se pudieron borrar los correos. Intentá nuevamente.');
        } finally {
            setPreferencesBusy(false);
        }
    }


    async function handleLogin() {
        if (loading || preferencesBusy) return;

        setError('');

        if (!email.trim() || !password) {
            setError('Ingresá tu correo y contraseña.');
            return;
        }

        setLoading(true);

        try {
            await signIn(email, password, { rememberEmail: remember });
            setPassword('');
        } catch (requestError) {
            const status = requestError.response?.status;

            if (status === 400) {
                setError('Revisá el correo y la contraseña ingresados.');
            } else if (status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else if (status === 429) {
                setError(
                    'Demasiados intentos. Esperá antes de volver a iniciar sesión.'
                );
            } else {
                setError(
                    'No se pudo completar el acceso. Revisá la conexión e intentá nuevamente.'
                );
            }
        } finally {
            setLoading(false);
        }
    }

    function handleCreateAccount(event) {
        if (Platform.OS === 'web') {
            event.currentTarget?.blur?.();
        }

        navigation.navigate('RequestAccess');
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
                    <Image
                        source={require('../../assets/lomas-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        accessibilityLabel="Logo de Lomas Eveneser"
                    />

                    <Text style={styles.title}>Iniciar sesión</Text>

                    <Text style={styles.label}>Correo electrónico</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        editable={!loading}
                        accessibilityLabel="Correo electrónico"
                    />

                    {remember && savedEmails.length > 0 ? (
                        <View style={styles.savedEmails}>
                            <Text style={styles.savedLabel}>Correos recordados</Text>
                            <ScrollView style={styles.emailList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                {savedEmails.map((savedEmail) => (
                                    <Pressable
                                        key={savedEmail}
                                        disabled={loading || preferencesBusy}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Usar correo ${savedEmail}`}
                                        onPress={() => {
                                            setEmail(savedEmail);
                                            setPassword('');
                                            setError('');
                                        }}
                                        style={styles.savedEmailButton}
                                    >
                                        <Text style={styles.savedEmailText}>{savedEmail}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    ) : null}

                    <Text style={styles.label}>Contraseña</Text>
                    <PasswordInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="current-password"
                        editable={!loading}
                        accessibilityLabel="Contraseña"
                        onSubmitEditing={handleLogin}
                    />

                    <Pressable
                        onPress={toggleRemember}
                        disabled={loading || preferencesBusy || !preferencesReady}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: remember, disabled: loading || preferencesBusy || !preferencesReady }}
                        style={styles.rememberRow}
                    >
                        <Feather name={remember ? 'check-square' : 'square'} size={18} color={colors.primary} />
                        <Text style={styles.rememberText}>Recuérdame</Text>
                    </Pressable>
                    {storageError ? (
                        <Text style={styles.error} accessibilityRole="alert">{storageError}</Text>
                    ) : null}

                    {error ? (
                        <Text style={styles.error} accessibilityRole="alert">
                            {error}
                        </Text>
                    ) : null}

                    <Pressable
                        onPress={handleLogin}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading }}
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            loading && styles.buttonDisabled,
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Ingresar</Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={(event) => {
                            if (Platform.OS === 'web') {
                                event?.currentTarget?.blur?.();
                            }

                            navigation.navigate('ForgotPassword');
                        }}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading }}
                        style={styles.createAccountButton}
                    >
                        <Text style={styles.createAccountText}>
                            ¿Olvidaste tu contraseña?
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleCreateAccount}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading }}
                        style={styles.createAccountButton}
                    >
                        <Text style={styles.createAccountText}>
                            Crear cuenta
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    rememberRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        alignSelf: 'flex-start', minHeight: 44, gap: spacing.sm,
        marginTop: -spacing.sm, marginBottom: spacing.sm,
    },
    rememberText: { color: colors.text, fontSize: 14 },
    savedEmails: { marginBottom: spacing.md },
    savedLabel: { color: colors.textSecondary, textAlign: 'center', fontSize: 14 },
    emailList: { maxHeight: 144 },
    savedEmailButton: {
        minHeight: 48, justifyContent: 'center', alignItems: 'center',
        padding: spacing.sm,
    },
    savedEmailText: { color: colors.primary, textAlign: 'center', fontSize: 16 },
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
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
    logo: {
        width: 160,
        height: 160,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    title: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    description: {
    textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    label: {
    textAlign: 'center',
        color: colors.text,
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    input: {
    textAlign: 'center',
        color: colors.text,
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.input,
        minHeight: 48,
        padding: spacing.md,
        fontSize: 16,
        marginBottom: spacing.md,
    },
    error: {
    textAlign: 'center',
        color: colors.error,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: spacing.md,
    },
    button: {
        minHeight: 48,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.button,
        backgroundColor: colors.primary,
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
    createAccountButton: {
        minHeight: 48,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    createAccountText: {
        color: colors.primary,
        fontSize: 16,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});