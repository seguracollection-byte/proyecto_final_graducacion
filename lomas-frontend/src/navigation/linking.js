import { Linking, Platform } from 'react-native';
import {
  getStateFromPath,
  getPathFromState,
} from '@react-navigation/native';

const config = {
  screens: {
    Login: '',
    ActivateAccount: 'activar',
  },
};

function isValidToken(token) {
  return (
    typeof token === 'string' &&
    /^[a-f0-9]{64}$/.test(token)
  );
}

export const linking = {
  prefixes: [
    'http://localhost:8082',
    'http://127.0.0.1:8082',
  ],
  config,

  async getInitialURL() {
    return Linking.getInitialURL();
  },

  subscribe(listener) {
    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => listener(url)
    );

    return () => subscription.remove();
  },

  getStateFromPath(path, options) {
    const hashIndex = path.indexOf('#');

    const pathname = (
      hashIndex >= 0 ? path.slice(0, hashIndex) : path
    ).split('?')[0];

    let fragment = hashIndex >= 0
      ? path.slice(hashIndex + 1)
      : '';

    if (Platform.OS === 'web') {
      fragment = globalThis.location?.hash?.slice(1) || fragment;
    }

    if (pathname.replace(/^\/+|\/+$/g, '') === 'activar') {
      const token = new URLSearchParams(fragment).get('token');

      return {
        routes: [
          {
            name: 'ActivateAccount',
            params: {
              token: isValidToken(token) ? token : undefined,
            },
          },
        ],
      };
    }

    return getStateFromPath(path, options);
  },

  getPathFromState(state, options) {
    const route = state.routes[state.index ?? state.routes.length - 1];

    if (route.name === 'ActivateAccount') {
      const token = route.params?.token;

      return isValidToken(token)
        ? `/activar#token=${token}`
        : '/activar';
    }

    return getPathFromState(state, options);
  },
};