const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  normalizeBiometricPublicKey,
  verifyBiometricSignature,
} = require('../services/biometricCryptoService');

test(
  'biometría verifica firmas y rechaza mensajes o claves incorrectos',
  () => {
    // Claves ficticias: existen únicamente durante esta prueba.
    const firstDevice = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 65537,
    });

    const secondDevice = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 65537,
    });

    function exportPublicKey(key) {
      return key.export({
        format: 'der',
        type: 'spki',
      }).toString('base64');
    }

    const publicKey = exportPublicKey(firstDevice.publicKey);
    const otherPublicKey = exportPublicKey(
      secondDevice.publicKey
    );

    const message =
      'lomas-eveneser:biometria:prueba:desafio-ficticio';

    const signature = crypto.sign(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key: firstDevice.privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      }
    ).toString('base64');

    const normalized = normalizeBiometricPublicKey(
      publicKey
    );

    assert.equal(normalized.publicKey, publicKey);

    assert.equal(
      normalized.fingerprint,
      crypto
        .createHash('sha256')
        .update(Buffer.from(publicKey, 'base64'))
        .digest('hex')
    );

    assert.equal(
      verifyBiometricSignature({
        publicKey,
        message,
        signature,
      }),
      true
    );

    // La misma firma no sirve para un mensaje diferente.
    assert.equal(
      verifyBiometricSignature({
        publicKey,
        message: `${message}:alterado`,
        signature,
      }),
      false
    );

    // La clave pública de otro dispositivo no sirve.
    assert.equal(
      verifyBiometricSignature({
        publicKey: otherPublicKey,
        message,
        signature,
      }),
      false
    );

    const alteredSignature = Buffer.from(
      signature,
      'base64'
    );

    alteredSignature[0] ^= 1;

    assert.equal(
      verifyBiometricSignature({
        publicKey,
        message,
        signature: alteredSignature.toString('base64'),
      }),
      false
    );

    for (const invalidSignature of [
      '',
      'invalida',
      Buffer.alloc(10).toString('base64'),
    ]) {
      assert.equal(
        verifyBiometricSignature({
          publicKey,
          message,
          signature: invalidSignature,
        }),
        false
      );
    }

    for (const invalidMessage of [
      '',
      'a'.repeat(1025),
      'mensaje\nalterado',
    ]) {
      assert.equal(
        verifyBiometricSignature({
          publicKey,
          message: invalidMessage,
          signature,
        }),
        false
      );
    }

    const ecDevice = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });

    assert.throws(() =>
      normalizeBiometricPublicKey(
        exportPublicKey(ecDevice.publicKey)
      )
    );

    assert.throws(() =>
      normalizeBiometricPublicKey('clave-invalida')
    );

    assert.equal(
      verifyBiometricSignature({
        publicKey: 'clave-invalida',
        message,
        signature,
      }),
      false
    );
  }
);