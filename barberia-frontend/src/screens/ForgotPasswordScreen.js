import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView } from 'react-native';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRecuperar = async () => {
        if (!email) {
            Alert.alert('Campo requerido', 'Por favor ingresa tu correo electrónico.');
            return;
        }

        setLoading(true);
        try {
            // Llama al nuevo endpoint del backend
            const response = await api.post('/auth/recuperar', { email });

            if (response.data.success) {
                Alert.alert(
                    '¡Correo Enviado!',
                    'Revisa tu bandeja de entrada. Te hemos enviado una contraseña temporal válida para cualquiera de tus perfiles.',
                    [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]
                );
            }
        } catch (error) {
            console.log('Error de recuperación:', error.response?.data);
            const errorMsg = error.response?.data?.message || 'No se pudo procesar la solicitud de recuperación.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.outerContainer} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.logoTitle}>Pierce Barber Shop</Text>
            <Text style={styles.title}>Recuperar Contraseña</Text>
            <Text style={styles.subtitle}>
                Ingresa el correo electrónico real con el que registraste tu cuenta. Te enviaremos una clave de acceso de inmediato.
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Correo Electrónico"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleRecuperar} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#141419" />
                ) : (
                    <Text style={styles.buttonText}>📧 Enviar Contraseña Temporal</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backButtonText}>Regresar a Iniciar Sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#141419', height: '100vh' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 25 },
    logoTitle: { color: '#d4af37', fontSize: 26, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
    title: { color: '#ffffff', fontSize: 18, fontWeight: '500', textAlign: 'center', marginVertical: 10 },
    subtitle: { color: '#a0a0a9', fontSize: 13, textAlign: 'center', marginBottom: 30, lineHeight: 18 },
    input: { backgroundColor: '#1e1e24', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#2c2c35' },
    button: { backgroundColor: '#d4af37', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
    buttonText: { color: '#141419', fontSize: 15, fontWeight: 'bold' },
    backButton: { marginTop: 25, padding: 10 },
    backButtonText: { color: '#aaa', textAlign: 'center', fontSize: 14, textDecorationLine: 'underline' }
});