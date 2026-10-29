const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const database = require('../config/lomasDatabase');
const challenges = require('../services/mfaChallengeService');
const tokens = require('../services/tokenService');

test(
  'login exige MFA después de validar una cuenta activa',
  async () => {
    const originalGetPool = database.getLomasPool;
    const originalCreateChallenge = challenges.createMfaChallenge;
    const originalCreateToken = tokens.createAccessToken;

    const controllerPath = require.resolve(
      '../controllers/loginController'
    );

    const password = 'ClaveFicticia123!';
    const hash = await bcrypt.hash(password, 4);

    const activeUser = {
      id: 1,
      nombre: 'Persona Prueba',
      email: 'persona@example.com',
      password_hash: hash,
      rol: 'usuario',
      estado: 'activo',
      version_sesion: 1,
    };

    let currentUser;
    let databaseFails = false;
    let challengeFails = false;
    let purpose = 'configuracion';
    let challengeCalls = 0;
    let tokenCalls = 0;

    database.getLomasPool = () => ({
      async execute(_sql, params) {
        assert.deepEqual(
          params,
          ['persona@example.com']
        );

        if (databaseFails) {
          throw new Error('Fallo simulado de base de datos');
        }

        return [currentUser ? [currentUser] : []];
      },
    });

    challenges.createMfaChallenge = async (user) => {
      challengeCalls += 1;

      assert.equal(user.id, activeUser.id);
      assert.equal(user.password_hash, hash);
      assert.equal(user.version_sesion, 1);

      if (challengeFails) {
        throw new Error('Fallo simulado de MFA');
      }

      return {
        challenge: 'a'.repeat(64),
        purpose,
        expiresIn: 300,
      };
    };

    tokens.createAccessToken = () => {
      tokenCalls += 1;
      throw new Error('El login no debe emitir sesiones');
    };

    delete require.cache[controllerPath];

    try {
      const {
        login,
      } = require('../controllers/loginController');

      async function request(inputPassword = password) {
        const req = {
          body: {
            email: 'persona@example.com',
            password: inputPassword,
            rol: 'administrador',
            mfaRequired: false,
          },
        };

        const res = {
          statusCode: 200,
          headers: {},

          status(code) {
            this.statusCode = code;
            return this;
          },

          set(name, value) {
            this.headers[name] = value;
            return this;
          },

          json(body) {
            this.body = body;
            return this;
          },
        };

        await login(req, res);
        return res;
      }

      for (const user of [
        undefined,
        { ...activeUser, password_hash: null },
        { ...activeUser, estado: 'inactivo' },
        { ...activeUser, estado: 'pendiente_activacion' },
      ]) {
        currentUser = user;

        const response = await request();

        assert.equal(response.statusCode, 401);
        assert.equal(
          response.headers['Cache-Control'],
          'no-store'
        );

        assert.deepEqual(response.body, {
          success: false,
          message: 'Correo o contraseña incorrectos.',
        });
      }

      currentUser = activeUser;

      const incorrect = await request(
        'OtraClaveFicticia!'
      );

      assert.equal(incorrect.statusCode, 401);
      assert.equal(challengeCalls, 0);
      assert.equal(tokenCalls, 0);

      for (const nextStep of [
        'configuracion',
        'verificacion',
      ]) {
        purpose = nextStep;

        const accepted = await request();

        assert.equal(accepted.statusCode, 202);
        assert.equal(
          accepted.headers['Cache-Control'],
          'no-store'
        );

        assert.equal(accepted.body.success, true);
        assert.equal(accepted.body.mfaRequired, true);
        assert.equal(accepted.body.nextStep, nextStep);
        assert.equal(accepted.body.expiresIn, 300);

        assert.equal(
          accepted.body.challenge,
          'a'.repeat(64)
        );

        assert.equal(accepted.body.token, undefined);
        assert.equal(accepted.body.user, undefined);
        assert.equal(accepted.body.password_hash, undefined);
      }

      assert.equal(challengeCalls, 2);
      assert.equal(tokenCalls, 0);

      challengeFails = true;

      const mfaUnavailable = await request();

      assert.equal(mfaUnavailable.statusCode, 503);
      assert.equal(
        mfaUnavailable.body.challenge,
        undefined
      );
      assert.equal(mfaUnavailable.body.token, undefined);
      assert.equal(tokenCalls, 0);

      challengeFails = false;
      databaseFails = true;

      const callsBeforeFailure = challengeCalls;
      const databaseUnavailable = await request();

      assert.equal(databaseUnavailable.statusCode, 503);
      assert.equal(
        challengeCalls,
        callsBeforeFailure
      );
      assert.equal(databaseUnavailable.body.token, undefined);
      assert.equal(tokenCalls, 0);
    } finally {
      database.getLomasPool = originalGetPool;
      challenges.createMfaChallenge = originalCreateChallenge;
      tokens.createAccessToken = originalCreateToken;
      delete require.cache[controllerPath];
    }
  }
);