// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import BarberoDashboard from './src/screens/BarberoDashboard';
import ClienteHome from './src/screens/ClienteHome';
import AgendarCitaScreen from './src/screens/AgendarCitaScreen';
// 🌟 CORREGIDO: Añadimos /src/ para que encuentre la ruta real del archivo
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'; 

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="BarberoDashboard" component={BarberoDashboard} />
        <Stack.Screen name="ClienteHome" component={ClienteHome} />
        <Stack.Screen name="AgendarCita" component={AgendarCitaScreen} />
        {/* Registro correcto de la pantalla de recuperación */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Recuperar Contraseña' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}