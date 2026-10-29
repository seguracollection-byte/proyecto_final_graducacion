import React from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';

import {
  AuthProvider,
  useAuth,
} from './src/context/AuthContext';

import LomasLoginScreen from './src/screens/LomasLoginScreen';
import LomasHomeScreen from './src/screens/LomasHomeScreen';
import ActivateAccountScreen from './src/screens/ActivateAccountScreen';
import RequestAccessScreen from './src/screens/RequestAccessScreen';
import AdminAccessScreen from './src/screens/AdminAccessScreen';
import PendingActivationsScreen from './src/screens/PendingActivationsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import MfaScreen from './src/screens/MfaScreen';
import AccountSettingsScreen from './src/screens/AccountSettingsScreen';
import BiometricSettingsScreen from './src/screens/BiometricSettingsScreen';

import {
  colors,
  spacing,
  radius,
} from './src/theme/theme';

import { linking } from './src/navigation/linking';

const Stack = createStackNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

function AppNavigation() {
  const {
    user,
    loading,
    sessionError,
    restoreSession,
    pendingMfa,
  } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.message}>
          Comprobando sesión…
        </Text>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.center}>
        <Text
          style={styles.message}
          accessibilityRole="alert"
        >
          {sessionError}
        </Text>

        <Pressable
          onPress={restoreSession}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={user || pendingMfa ? undefined : linking}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: {
            flex: 1,
            minHeight: 0,
            backgroundColor: colors.background,
          },
        }}
      >
        {user ? (
          <Stack.Group navigationKey="authenticated">
            <Stack.Screen
              name="Home"
              component={LomasHomeScreen}
            />

            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen
              name="BiometricSettings"
              component={BiometricSettingsScreen}
            />

            {user.rol === 'administrador' ? (
              <>
                <Stack.Screen
                  name="AdminAccess"
                  component={AdminAccessScreen}
                />

                <Stack.Screen
                  name="PendingActivations"
                  component={PendingActivationsScreen}
                />
              </>
            ) : null}
          </Stack.Group>
        ) : pendingMfa ? (
          <Stack.Group navigationKey="mfa">
            <Stack.Screen
              name="Mfa"
              component={MfaScreen}
              options={{
                gestureEnabled: false,
              }}
            />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey="public">
            <Stack.Screen
              name="Login"
              component={LomasLoginScreen}
            />

            <Stack.Screen
              name="ActivateAccount"
              component={ActivateAccountScreen}
            />

            <Stack.Screen
              name="RequestAccess"
              component={RequestAccessScreen}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { height } = useWindowDimensions();

  const viewportStyle =
    Platform.OS === 'web'
      ? {
          height,
          width: '100%',
          flexShrink: 0,
          overflow: 'hidden',
        }
      : styles.screen;

  return (
    <View style={viewportStyle}>
      <SafeAreaProvider style={styles.screen}>
        <SafeAreaView style={styles.screen}>
          <StatusBar style="light" />

          <AuthProvider>
            <AppNavigation />
          </AuthProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: spacing.md,
    maxWidth: 480,
  },
  button: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});