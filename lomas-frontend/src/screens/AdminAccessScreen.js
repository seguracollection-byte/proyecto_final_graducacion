import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

function blurWebButton(event) {
    if (Platform.OS === 'web') {
        event.currentTarget?.blur?.();
    }
}

export default function AdminAccessScreen({ navigation }) {
    const { user, token } = useAuth();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [selection, setSelection] = useState(null);
    const [busy, setBusy] = useState(false);
    const [needsRefresh, setNeedsRefresh] = useState(false);
    const [notice, setNotice] = useState(null);

    const sending = useRef(false);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const controller = new AbortController();

            async function loadRequests() {
                setLoading(true);
                setError('');
                setRequests([]);
                setSelection(null);
                setNeedsRefresh(false);

                if (user?.rol !== 'administrador' || !token) {
                    setError('Esta pantalla requiere una sesión administradora.');
                    setLoading(false);
                    return;
                }

                try {
                    const response = await api.get('/admin/solicitudes', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                        timeout: 15000,
                    });

                    if (
                        response.data?.success !== true ||
                        !Array.isArray(response.data.solicitudes)
                    ) {
                        throw new Error('Respuesta inesperada');
                    }

                    if (active) {
                        setRequests(response.data.solicitudes);
                    }
                } catch (requestError) {
                    if (!active) return;

                    const status = requestError.response?.status;

                    if (status === 401) {
                        setError('Tu sesión venció. Volvé a iniciar sesión.');
                    } else if (status === 403) {
                        setError('No tenés permiso para consultar solicitudes.');
                    } else {
                        setError(
                            'No se pudieron cargar las solicitudes. Revisá la conexión y reintentá.'
                        );
                    }
                } finally {
                    if (active) setLoading(false);
                }
            }

            loadRequests();

            return () => {
                active = false;
                controller.abort();
            };
        }, [user?.rol, token, refresh])
    );

    function handleBack(event) {
        if (sending.current) return;

        blurWebButton(event);

        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Home');
        }
    }

    function handleRefresh(event) {
        if (sending.current || loading) return;

        blurWebButton(event);
        setNotice(null);
        setRefresh((value) => value + 1);
    }

    function selectAction(event, id, action) {
        if (sending.current || loading || needsRefresh) return;

        blurWebButton(event);
        setNotice(null);
        setSelection({ id, action });
    }

    function cancelAction(event) {
        if (sending.current) return;

        blurWebButton(event);
        setSelection(null);
    }

    async function confirmAction(event, request) {
        if (
            sending.current ||
            loading ||
            needsRefresh ||
            selection?.id !== request.id ||
            !['aprobar', 'rechazar'].includes(selection?.action)
        ) {
            return;
        }

        const action = selection.action;

        blurWebButton(event);
        sending.current = true;
        setBusy(true);
        setNotice(null);

        try {
            const response = await api.post(
                `/admin/solicitudes/${request.id}/${action}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: action === 'aprobar' ? 30000 : 15000,
                }
            );

            const data = response.data;

            if (
                data?.success !== true ||
                (action === 'aprobar' && data.aprobada !== true)
            ) {
                throw new Error('Respuesta inesperada');
            }

            setRequests((current) =>
                current.filter((item) => item.id !== request.id)
            );

            if (action === 'rechazar') {
                setNotice({
                    type: 'success',
                    message: 'Solicitud rechazada correctamente.',
                });
            } else if (data.correoAceptado === true) {
                setNotice({
                    type: 'success',
                    message:
                        'Solicitud aprobada. El servidor de correo aceptó el envío de activación. La persona debe establecer su contraseña para entrar.',
                });
            } else {
                setNotice({
                    type: 'warning',
                    message:
                        'La solicitud quedó aprobada, pero no se confirmó el correo. La cuenta sigue pendiente de activación y necesita un reenvío. No vuelvas a aprobarla.',
                });
            }
        } catch (requestError) {
            const status = requestError.response?.status;
            const data = requestError.response?.data;

            let message;

            if (status === 401) {
                message = 'Tu sesión venció. Volvé a iniciar sesión.';
            } else if (status === 403) {
                message = 'No tenés permiso para realizar esta operación.';
            } else if (status === 409) {
                message =
                    'La solicitud ya fue revisada o no está disponible. Actualizá el listado.';
            } else if (status === 429) {
                message =
                    'Demasiados intentos de envío. Esperá antes de reintentar y actualizá el listado.';
            } else if (status === 503 && data?.message) {
                message = `${data.message} Actualizá el listado antes de continuar.`;
            } else {
                message =
                    'No se pudo confirmar el resultado. Actualizá el listado antes de volver a intentar. Si la aprobación se aplicó, no la repitas.';
            }

            setNotice({ type: 'error', message });
            setNeedsRefresh(true);
        } finally {
            setSelection(null);
            sending.current = false;
            setBusy(false);
        }
    }

    const actionsDisabled = busy || loading || needsRefresh;

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Pressable
                        onPress={handleBack}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Volver a la pantalla anterior"
                        accessibilityState={{ disabled: busy }}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed,
                        ]}
                    >
                        <Text style={styles.backArrow}>←</Text>
                    </Pressable>

                    <Text style={styles.brand}>LOMAS EVENESER</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.container}>
                    <Text style={styles.title}>Solicitudes de acceso</Text>

                    <Pressable
                        disabled={busy || loading}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy || loading }}
                        onPress={(event) => {
                            blurWebButton(event);
                            navigation.navigate('PendingActivations');
                        }}
                        style={[
                            styles.button,
                            (busy || loading) && styles.faded,
                        ]}
                    >
                        <Text style={styles.buttonText}>
                            Ver activaciones pendientes
                        </Text>
                    </Pressable>

                    <Text style={styles.description}>
                        Personas que están esperando una decisión de acceso.
                    </Text>

                    <Pressable
                        onPress={handleRefresh}
                        disabled={loading || busy}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading || busy }}
                        style={({ pressed }) => [
                            styles.button,
                            styles.refreshButton,
                            pressed && styles.buttonPressed,
                            (loading || busy) && styles.faded,
                        ]}
                    >
                        <Text style={styles.buttonText}>
                            Actualizar listado
                        </Text>
                    </Pressable>

                    {notice ? (
                        <Text
                            accessibilityRole="alert"
                            style={[
                                styles.notice,
                                notice.type === 'success'
                                    ? styles.success
                                    : notice.type === 'warning'
                                        ? styles.warning
                                        : styles.error,
                            ]}
                        >
                            {notice.message}
                        </Text>
                    ) : null}

                    {loading ? (
                        <View style={styles.status}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.description}>
                                Cargando solicitudes…
                            </Text>
                        </View>
                    ) : error ? (
                        <Text style={styles.error} accessibilityRole="alert">
                            {error}
                        </Text>
                    ) : requests.length === 0 ? (
                        <Text style={styles.description}>
                            No hay solicitudes pendientes.
                        </Text>
                    ) : (
                        requests.map((request) => {
                            const selected = selection?.id === request.id;
                            const approving = selection?.action === 'aprobar';

                            return (
                                <View key={request.id} style={styles.card}>
                                    <Text style={styles.name}>
                                        {request.nombre}
                                    </Text>

                                    <Text style={styles.description}>
                                        {request.email}
                                    </Text>

                                    <Text style={styles.pending}>
                                        Pendiente de aprobación
                                    </Text>

                                    {selected ? (
                                        <View style={styles.confirmation}>
                                            <Text style={styles.description}>
                                                {approving
                                                    ? '¿Aprobar esta solicitud como usuario común y enviarle un correo para activar su cuenta?'
                                                    : '¿Rechazar esta solicitud? No se creará una cuenta ni se enviará un correo.'}
                                            </Text>

                                            <Text style={styles.description}>
                                                {request.nombre}
                                                {'\n'}
                                                {request.email}
                                            </Text>

                                            <Pressable
                                                onPress={(event) =>
                                                    confirmAction(event, request)
                                                }
                                                disabled={actionsDisabled}
                                                accessibilityRole="button"
                                                accessibilityState={{
                                                    disabled: actionsDisabled,
                                                }}
                                                style={[
                                                    approving
                                                        ? styles.button
                                                        : styles.rejectButton,
                                                    actionsDisabled && styles.faded,
                                                ]}
                                            >
                                                {busy ? (
                                                    <ActivityIndicator
                                                        color={
                                                            approving
                                                                ? colors.onPrimary
                                                                : colors.error
                                                        }
                                                    />
                                                ) : (
                                                    <Text
                                                        style={
                                                            approving
                                                                ? styles.buttonText
                                                                : styles.rejectText
                                                        }
                                                    >
                                                        {approving
                                                            ? 'Confirmar aprobación'
                                                            : 'Confirmar rechazo'}
                                                    </Text>
                                                )}
                                            </Pressable>

                                            <Pressable
                                                onPress={cancelAction}
                                                disabled={busy}
                                                accessibilityRole="button"
                                                accessibilityState={{ disabled: busy }}
                                                style={styles.cancelButton}
                                            >
                                                <Text style={styles.cancelText}>
                                                    Cancelar
                                                </Text>
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <View style={styles.actions}>
                                            <Pressable
                                                onPress={(event) =>
                                                    selectAction(event, request.id, 'aprobar')
                                                }
                                                disabled={actionsDisabled}
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    `Aprobar solicitud de ${request.nombre}`
                                                }
                                                accessibilityState={{
                                                    disabled: actionsDisabled,
                                                }}
                                                style={[
                                                    styles.button,
                                                    actionsDisabled && styles.faded,
                                                ]}
                                            >
                                                <Text style={styles.buttonText}>
                                                    Aprobar
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={(event) =>
                                                    selectAction(event, request.id, 'rechazar')
                                                }
                                                disabled={actionsDisabled}
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    `Rechazar solicitud de ${request.nombre}`
                                                }
                                                accessibilityState={{
                                                    disabled: actionsDisabled,
                                                }}
                                                style={[
                                                    styles.rejectButton,
                                                    actionsDisabled && styles.faded,
                                                ]}
                                            >
                                                <Text style={styles.rejectText}>
                                                    Rechazar
                                                </Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        minHeight: 0,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    headerContent: {
        width: '100%',
        maxWidth: 900,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.button,
        marginRight: spacing.sm,
    },
    backButtonPressed: {
        backgroundColor: colors.surface,
    },
    backArrow: {
        color: colors.primary,
        fontSize: 30,
        lineHeight: 36,
    },
    brand: {
        flex: 1,
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    scroll: {
        flex: 1,
        minHeight: 0,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        alignItems: 'center',
    },
    container: {
        width: '100%',
        maxWidth: 900,
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
        marginBottom: spacing.md,
    },
    card: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    name: {
        color: colors.text,
        fontSize: 19,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    pending: {
        color: colors.primary,
        fontSize: 14,
        marginBottom: spacing.md,
    },
    status: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    notice: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: spacing.md,
    },
    error: {
        color: colors.error,
        fontSize: 16,
        lineHeight: 24,
    },
    success: {
        color: colors.success,
    },
    warning: {
        color: colors.primary,
    },
    actions: {
        gap: spacing.md,
    },
    button: {
        minHeight: 48,
        padding: spacing.md,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    refreshButton: {
        marginBottom: spacing.lg,
    },
    buttonPressed: {
        backgroundColor: colors.primaryPressed,
    },
    buttonText: {
        color: colors.onPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    confirmation: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.md,
    },
    rejectButton: {
        minHeight: 48,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        minHeight: 48,
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    cancelText: {
        color: colors.primary,
        fontSize: 16,
    },
    faded: {
        opacity: 0.5,
    },
});