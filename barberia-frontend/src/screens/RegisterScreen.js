import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView } from 'react-native';
import api from '../services/api';

export default function RegisterScreen({ navigation }) {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!nombre || !email || !telefono || !password) {
            alert('Todos los campos son obligatorios.');
            return;
        }

        setLoading(true);
        try {
            // Envía los datos limpios esperados por la validación del backend
            const response = await api.post('/auth/register', {
                nombre,
                email,
                telefono,
                password,
                rol: 'cliente' // Por defecto se registra como cliente
            });

            console.log("Respuesta servidor:", response.data);

            if (response.data.success) {
                // Compatible con Web y Móvil para garantizar la redirección automática
                alert('¡Éxito! Usuario creado correctamente.');
                navigation.navigate('Login');
            } else {
                alert(response.data.message || 'El registro fue rechazado.');
            }
        } catch (error) {
            console.log('Error de registro:', error.response?.data);
            const errorMsg = error.response?.data?.message || 'Error al procesar el registro.';
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.outerContainer} contentContainerStyle={styles.container}>
            <Text style={styles.logoTitle}>Pierce Barber Shop</Text>
            <Text style={styles.title}>Crear Cuenta</Text>

            <TextInput
                style={styles.input}
                placeholder="Nombre Completo"
                placeholderTextColor="#666"
                value={nombre}
                onChangeText={setNombre}
            />

            <TextInput
                style={styles.input}
                placeholder="Correo Electrónico"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Teléfono"
                placeholderTextColor="#666"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Contraseña (Mínimo 6 caracteres)"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#141419" />
                ) : (
                    <Text style={styles.buttonText}>Registrarse</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.backButtonText}>Regresar a Login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#141419' },
    container: { flexGrow: 1, justifyContent: 'center', padding: 25 },
    logoTitle: { color: '#d4af37', fontSize: 26, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1 },
    title: { fontSize: 16, fontWeight: '500', color: '#ffffff', marginBottom: 30, textAlign: 'center', marginTop: 5 },
    input: { backgroundColor: '#1e1e24', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#2c2c35' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e24', borderRadius: 8, borderWidth: 1, borderColor: '#2c2c35', marginBottom: 15 },
    passwordInput: { flex: 1, color: '#fff', padding: 15, fontSize: 16 },
    eyeButton: { paddingHorizontal: 15 },
    eyeText: { fontSize: 18 },
    button: { backgroundColor: '#d4af37', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#141419', fontSize: 16, fontWeight: 'bold' },
    linkText: { color: '#aaa', textAlign: 'center', marginTop: 25, fontSize: 14 },
    backButton: { marginTop: 20, padding: 10 },
    backButtonText: { color: '#d4af37', textAlign: 'center', fontSize: 15, textDecorationLine: 'underline' }
});