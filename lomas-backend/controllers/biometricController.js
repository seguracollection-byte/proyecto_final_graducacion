const {
  registerBiometricDevice,
} = require('../services/registerBiometricDeviceService');

const {
  confirmBiometricDevice,
} = require('../services/confirmBiometricDeviceService');

const {
  createBiometricLoginChallenge,
} = require('../services/biometricLoginChallengeService');

const {
  verifyBiometricLogin,
} = require('../services/verifyBiometricLoginService');

const {
  createAccessToken,
} = require('../services/tokenService');

function handleError(error, res) {
  const responses = {
    BIOMETRIC_SESSION_INVALID: {
      status: 401,
      message:
        'La sesión ya no está disponible. Iniciá sesión nuevamente.',
    },
    BIOMETRIC_CHALLENGE_INVALID: {
      status: 401,
      message:
        'La verificación venció o ya no está disponible. Iniciá nuevamente.',
    },
    BIOMETRIC_INPUT_INVALID: {
      status: 400,
      message:
        'Revisá los datos y la clave pública del dispositivo.',
    },
    BIOMETRIC_SIGNATURE_INVALID: {
      status: 400,
      message:
        'No se pudo comprobar la firma del dispositivo.',
    },
    BIOMETRIC_REGISTRATION_DENIED: {
      status: 403,
      message:
        'Primero configurá y confirmá Authenticator.',
    },
    BIOMETRIC_DEVICE_LIMIT: {
      status: 409,
      message:
        'La cuenta alcanzó el límite de dispositivos vinculados.',
    },
    BIOMETRIC_KEY_ALREADY_REGISTERED: {
      status: 409,
      message:
        'Esta clave ya está registrada. Generá una nueva vinculación.',
    },
  };

  const response = responses[error.code];

  if (response) {
    return res.status(response.status).json({
      success: false,
      message: response.message,
    });
  }

  console.error('No se pudo completar la operación biométrica.');

  return res.status(503).json({
    success: false,
    message:
      'No se pudo completar la operación. Intentá nuevamente.',
  });
}

async function beginDeviceRegistration(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await registerBiometricDevice({
      userId: req.user?.id,
      sessionVersion: req.auth?.sessionVersion,
      publicKey: req.body?.publicKey,
      name: req.body?.name,
      platform: req.body?.platform,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(error, res);
  }
}

async function finishDeviceRegistration(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await confirmBiometricDevice({
      userId: req.user?.id,
      sessionVersion: req.auth?.sessionVersion,
      challenge: req.body?.challenge,
      signature: req.body?.signature,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message:
        'Dispositivo vinculado correctamente.',
    });
  } catch (error) {
    return handleError(error, res);
  }
}

async function beginBiometricLogin(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await createBiometricLoginChallenge({
      challenge: req.body?.challenge,
      deviceId: req.body?.deviceId,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(error, res);
  }
}

async function finishBiometricLogin(req, res) {
  res.set('Cache-Control', 'no-store');

  try {
    const result = await verifyBiometricLogin({
      challenge: req.body?.challenge,
      signature: req.body?.signature,
    });

    const token = createAccessToken(
      result.user,
      'biometric'
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: result.user.id,
        nombre: result.user.nombre,
        email: result.user.email,
        rol: result.user.rol,
      },
      recoveryCodes: [],
    });
  } catch (error) {
    return handleError(error, res);
  }
}

module.exports = {
  beginDeviceRegistration,
  finishDeviceRegistration,
  beginBiometricLogin,
  finishBiometricLogin,
};