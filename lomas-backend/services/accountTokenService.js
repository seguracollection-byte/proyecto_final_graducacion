const crypto = require('node:crypto');

function hashAccountToken(token) {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw new Error('Formato de token inválido');
  }

  return crypto
    .createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

function createAccountToken() {
  const token = crypto.randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: hashAccountToken(token),
  };
}

module.exports = {
  createAccountToken,
  hashAccountToken,
};