import { Linking, Platform } from 'react-native';
import {
  getStateFromPath,
  getPathFromState,
} from '@react-navigation/native';

const config = {
  screens: {
    Login: '',
    ActivateAccount: 'activar',
    RequestAccess: 'crear-cuenta',
    ForgotPassword: 'recuperar',
    ResetPassword: 'restablecer',
  },
};

const tokenScreens = {
  activar: 'ActivateAccount',
  restablecer: 'ResetPassword',
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
    )
      .split('?')[0]
      .replace(/^\/+|\/+$/g, '');

    let fragment = hashIndex >= 0
      ? path.slice(hashIndex + 1)
      : '';

    if (Platform.OS === 'web') {
      fragment = globalThis.location?.hash?.slice(1) || fragment;
    }

    const screenName = Object.prototype.hasOwnProperty.call(
      tokenScreens,
      pathname
    )
      ? tokenScreens[pathname]
      : undefined;

    if (screenName) {
      const token = new URLSearchParams(fragment).get('token');

      return {
        routes: [
          {
            name: screenName,
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
    const route = state.routes[
      state.index ?? state.routes.length - 1
    ];

    const pathname =
      route.name === 'ActivateAccount'
        ? '/activar'
        : route.name === 'ResetPassword'
          ? '/restablecer'
          : undefined;

    if (pathname) {
      const token = route.params?.token;

      return isValidToken(token)
        ? `${pathname}#token=${token}`
        : pathname;
    }

    return getPathFromState(state, options);
  },
};