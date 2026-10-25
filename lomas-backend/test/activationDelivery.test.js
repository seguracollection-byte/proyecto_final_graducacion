const { test } = require('node:test');
const assert = require('node:assert/strict');

const emailConfig = require('../config/email');
const links = require('../config/accountLinks');
const mail = require('../services/activationEmailService');
const approval = require('../services/approveAccessService');
const renewal = require('../services/resendActivationService');

test('aprobación y reenvío distinguen cambios y entrega de correo', async () => {
  const originals = {
    config: emailConfig.loadEmailConfig,
    link: links.buildActivationLink,
    mail: mail.sendActivationEmail,
    approve: approval.approveAccessRequest,
    renew: renewal.renewActivationToken,
  };

  const paths = [
    require.resolve('../controllers/approvalController'),
    require.resolve('../controllers/resendActivationController'),
  ];

  let enabled;
  let serviceError;
  let mailFails;
  let serviceCalls;
  let mailCalls;

  emailConfig.loadEmailConfig = () => ({ enabled });
  links.buildActivationLink = () => 'http://localhost:8082/activar';

  async function fakeService(requestId, adminId) {
    serviceCalls += 1;
    assert.equal(requestId, 4);
    assert.equal(adminId, 1);

    if (serviceError) {
      const error = new Error('Fallo simulado');
      error.code = serviceError;
      throw error;
    }

    return {
      userId: 2,
      email: 'persona@example.com',
      activationToken: 'a'.repeat(64),
    };
  }

  approval.approveAccessRequest = fakeService;
  renewal.renewActivationToken = fakeService;

  mail.sendActivationEmail = async (email, token) => {
    mailCalls += 1;
    assert.equal(email, 'persona@example.com');
    assert.equal(token, 'a'.repeat(64));

    if (mailFails) throw new Error('Correo simulado fallido');

    return { accepted: true };
  };

  paths.forEach((path) => delete require.cache[path]);

  try {
    const { approve } = require('../controllers/approvalController');
    const {
      resendActivation,
    } = require('../controllers/resendActivationController');

    async function request(handler) {
      const res = {
        statusCode: 200,
        set() {
          return this;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };

      await handler(
        { params: { id: 4 }, user: { id: 1 } },
        res
      );

      assert.equal(res.body.activationToken, undefined);
      assert.equal(res.body.token, undefined);

      return res;
    }

    for (const [handler, conflictCode, changedField] of [
      [approve, 'APPROVAL_CONFLICT', 'aprobada'],
      [resendActivation, 'ACTIVATION_CONFLICT', 'enlaceRenovado'],
    ]) {
      enabled = false;
      serviceError = undefined;
      mailFails = false;
      serviceCalls = 0;
      mailCalls = 0;

      const disabled = await request(handler);
      assert.equal(disabled.statusCode, 503);
      assert.equal(serviceCalls, 0);
      assert.equal(mailCalls, 0);

      enabled = true;

      for (const [code, status] of [
        ['ADMIN_NOT_ACTIVE', 403],
        [conflictCode, 409],
        ['DATABASE_FAILURE', 503],
      ]) {
        serviceError = code;

        const failed = await request(handler);
        assert.equal(failed.statusCode, status);
        assert.equal(failed.body.success, false);
        assert.equal(mailCalls, 0);
      }

      serviceError = undefined;
      mailFails = true;

      const deliveryFailed = await request(handler);
      assert.equal(deliveryFailed.statusCode, 202);
      assert.equal(deliveryFailed.body[changedField], true);
      assert.equal(deliveryFailed.body.correoAceptado, false);

      mailFails = false;

      const delivered = await request(handler);
      assert.equal(delivered.statusCode, 200);
      assert.equal(delivered.body[changedField], true);
      assert.equal(delivered.body.correoAceptado, true);
    }
  } finally {
    emailConfig.loadEmailConfig = originals.config;
    links.buildActivationLink = originals.link;
    mail.sendActivationEmail = originals.mail;
    approval.approveAccessRequest = originals.approve;
    renewal.renewActivationToken = originals.renew;
    paths.forEach((path) => delete require.cache[path]);
  }
});