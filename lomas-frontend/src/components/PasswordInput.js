import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { colors } from '../theme/theme';

import { Feather } from '@expo/vector-icons';

export default function PasswordInput({
  style,
  editable = true,
  onBlur,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);
  const isFocused = useIsFocused();

  function hidePassword() {
    clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
  }

  function toggleVisibility() {
    clearTimeout(timer.current);

    if (visible) {
      hidePassword();
      return;
    }

    setVisible(true);
    timer.current = setTimeout(hidePassword, 3000);
  }

  useEffect(() => {
    if (!isFocused || !editable) {
      hidePassword();
    }
  }, [isFocused, editable]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state !== 'active') {
          hidePassword();
        }
      }
    );

    return () => {
      clearTimeout(timer.current);
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!visible}
        style={[style, styles.input]}
        onBlur={(event) => {
          hidePassword();
          onBlur?.(event);
        }}
      />

      <Pressable
        onPress={toggleVisibility}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={
          visible ? 'Ocultar contraseña' : 'Mostrar contraseña por 3 segundos'
        }
        accessibilityState={{ disabled: !editable }}
        style={styles.eyeButton}
      >
        <Feather
          name={visible ? 'eye-off' : 'eye'}
          size={22}
          color={colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  input: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 0,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});