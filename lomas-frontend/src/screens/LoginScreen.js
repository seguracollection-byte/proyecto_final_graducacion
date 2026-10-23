import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            const titulo = 'Campos Obligatorios';
            const mensaje = 'Por favor, ingrese su correo electrónico y contraseña.';

            if (Alert.alert === undefined || typeof Alert.alert !== 'function' || !Alert.alert) {
                alert(`${titulo}: ${mensaje}`);
            } else {
                Alert.alert(titulo, mensaje);
            }
            return;
        }

        setLoading(true);
        try {
            console.log('Enviando datos al backend...');
            const response = await api.post('/auth/login', {
                email: email.trim(),
                password: password.trim()
            });

            console.log('Respuesta del backend recibida:', response.data);
            
            if (response.data && response.data.success) {
                const loggedUser = response.data.user || {};
                const userRol = loggedUser.rol ? loggedUser.rol.toLowerCase().trim() : '';
                const userEmail = email.toLowerCase().trim();

                // 🛡️ ESCUDO DE REDIRECCIÓN PARA ADMINISTRADOR
                if (userRol === 'admin' || userRol === 'administrador' || userEmail.includes('admin')) {
                    console.log('🚀 Redirigiendo al Panel de Administración');
                    
                    const secureAdminUser = {
                        id: loggedUser.id || 4,
                        nombre: loggedUser.nombre || "Guillermo Admin",
                        email: loggedUser.email || email.trim(),
                        rol: "administrador"
                    };
                    
                    navigation.replace('AdminDashboard', { user: secureAdminUser });
                } 
                else if (userRol === 'barbero') {
                    navigation.replace('BarberoDashboard', { user: loggedUser });
                } 
                else {
                    navigation.replace('ClienteHome', { user: loggedUser });
                }
            
            } else {
                const errorMsg = response.data.message || 'Credenciales incorrectas';
                if (Alert.alert === undefined || typeof Alert.alert !== 'function' || !Alert.alert) {
                    alert(errorMsg);
                } else {
                    Alert.alert('Error de Autenticación', errorMsg);
                }
            }
        } catch (error) {
            console.error('❌ Error crítico en la petición de Login:', error);
            const msgFallo = 'No se pudo conectar con el servidor. Verifique que el backend esté encendido.';
            if (Alert.alert === undefined || typeof Alert.alert !== 'function' || !Alert.alert) {
                alert(msgFallo);
            } else {
                Alert.alert('Error de Conexión', msgFallo);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.outerContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.container}>
                <Text style={styles.logoTitle}>Pierce Barber Shop</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Correo Electrónico"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Contraseña"
                        placeholderTextColor="#666"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                        <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#121212" />
                    ) : (
                        <Text style={styles.buttonText}>Iniciar Sesión</Text>
                    )}
                </TouchableOpacity>

                {/* Enlace elegante de Olvidé mi Contraseña */}
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: 15 }}>
                    <Text style={styles.forgotText}>¿Olvidaste tu contraseña? Recupérala aquí</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkText}>¿No tienes cuenta? Regístrate aquí</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.guestButton}
                    onPress={() => navigation.navigate('AgendarCita', { user: null })}
                >
                    <Text style={styles.guestButtonText}>Continuar como Invitado</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#141419', height: '100vh' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    container: { padding: 25 },
    logoTitle: { color: '#d4af37', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, letterSpacing: 1 },
    input: { backgroundColor: '#1e1e24', color: '#ffffff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#2c2c35', fontSize: 15 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e24', borderRadius: 8, borderWidth: 1, borderColor: '#2c2c35', marginBottom: 15 },
    passwordInput: { flex: 1, color: '#ffffff', padding: 15, fontSize: 15 },
    eyeButton: { paddingHorizontal: 15 },
    eyeText: { fontSize: 18 },
    button: { backgroundColor: '#d4af37', padding: 15, borderRadius: 8, marginTop: 10 },
    buttonText: { color: '#141419', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
    forgotText: { color: '#e5c158', textAlign: 'center', fontSize: 14, textDecorationLine: 'underline', fontWeight: '500' },
    linkText: { color: '#aaa', textAlign: 'center', marginTop: 20, fontSize: 14 },
    guestButton: { marginTop: 30, padding: 10 },
    guestButtonText: { color: '#d4af37', textAlign: 'center', fontSize: 15, textDecorationLine: 'underline' }
});