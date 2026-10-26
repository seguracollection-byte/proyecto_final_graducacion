import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import api from '../services/api';
import { colors, spacing, radius } from '../theme/theme';
import PasswordInput from '../components/PasswordInput';

export default function ActivateAccountScreen({
    route,
    navigation,
}) {
    const token = route?.params?.token;
    const validToken =
        typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [completed, setCompleted] = useState(false);

    async function handleActivate() {
        if (loading) return;

        setError('');

        if (!validToken) {
            setError('El enlace no contiene un token válido.');
            return;
        }

        if (Array.from(password).length < 12) {
            setError('La contraseña debe tener al menos 12 caracteres.');
            return;
        }

        if (password !== confirmation) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        try {
            await api.post(
                '/activar-cuenta',
                {
                    token,
                    password,
                    passwordConfirm: confirmation,
                },
                { timeout: 15000 }
            );

            setPassword('');
            setConfirmation('');
            setCompleted(true);
        } catch (requestError) {
            const status = requestError.response?.status;
            const data = requestError.response?.data;

            if (status === 400) {
                setError(
                    data?.message ||
                    data?.errors?.[0]?.mensaje ||
                    'Revisá los datos de activación.'
                );
            } else if (status === 429) {
                setError('Demasiados intentos. Esperá antes de reintentar.');
            } else if (!requestError.response) {
                setError(
                    'No se pudo confirmar el resultado. Intentá iniciar sesión; si la cuenta sigue pendiente, solicitá ayuda al administrador.'
                );
            } else {
                setError('No se pudo activar la cuenta. Intentá más tarde.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.brand}>LOMAS EVENESER</Text>
                    <Text style={styles.title}>
                        {completed ? 'Cuenta activada' : 'Activá tu cuenta'}
                    </Text>

                    {completed ? (
                        <>
                            <Text style={styles.description}>
                                Tu contraseña quedó establecida. Ya podés iniciar sesión.
                            </Text>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.button,
                                    pressed && styles.buttonPressed,
                                ]}
                                onPress={() => navigation.replace('Login')}
                            >
                                <Text style={styles.buttonText}>
                                    Ir a iniciar sesión
                                </Text>
                            </Pressable>
                        </>
                    ) : !validToken ? (
                        <Text style={styles.error} accessibilityRole="alert">
                            Abrí el enlace de activación enviado a tu correo.
                            Si venció o ya no está disponible, pedí un reenvío
                            al administrador.
                        </Text>
                    ) : (
                        <>
                            <Text style={styles.description}>
                                Elegí una contraseña.
                                {'\n'}
                                Como mínimo usá 12 caracteres. 
                                {'\n'}
                                Usa mayúsculas, minúsculas, números y símbolos para mayor seguridad.
                                
                            </Text>

                            <Text style={styles.label}>Contraseña nueva</Text>
                            <PasswordInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                accessibilityLabel="Contraseña nueva"
                            />

                            <Text style={styles.label}>Repetir contraseña</Text>
                            <PasswordInput
                                style={styles.input}
                                value={confirmation}
                                onChangeText={setConfirmation}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                accessibilityLabel="Repetir contraseña"
                            />

                            {error ? (
                                <Text style={styles.error} accessibilityRole="alert">
                                    {error}
                                </Text>
                            ) : null}

                            <Pressable
                                disabled={loading}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: loading }}
                                onPress={handleActivate}
                                style={({ pressed }) => [
                                    styles.button,
                                    pressed && styles.buttonPressed,
                                    loading && styles.buttonDisabled,
                                ]}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.onPrimary} />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        Activar cuenta
                                    </Text>
                                )}
                            </Pressable>
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
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
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    brand: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    title: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    description: {
        color: colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    label: {
        color: colors.text,
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    input: {
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
        color: colors.error,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: spacing.md,
    },
    button: {
        minHeight: 48,
        backgroundColor: colors.primary,
        borderRadius: radius.button,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    buttonPressed: {
        backgroundColor: colors.primaryPressed,
    },
    buttonDisabled: {
        backgroundColor: colors.disabled,
    },
    buttonText: {
        color: colors.onPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
});