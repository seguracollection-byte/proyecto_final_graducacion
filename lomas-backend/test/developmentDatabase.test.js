const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateDevelopmentDatabase } = require('../config/developmentDatabase');
const valid = { DB_HOST:'127.0.0.1', DB_PORT:'3306', DB_NAME:'lomas_eveneser_dev', DB_USER:'lomas_app_dev', DB_PASSWORD:'clave-ficticia-prueba' };
test('rechaza base anterior, root, host distinto y contraseña sin configurar', () => {
  for (const change of [{DB_NAME:'barberia_db'}, {DB_USER:'root'}, {DB_HOST:'otro-servidor'}, {DB_PORT:'3307'}, {DB_PASSWORD:''}, {DB_PASSWORD:'CAMBIAR_SOLO_LOCALMENTE'}]) {
    assert.throws(() => validateDevelopmentDatabase({...valid, ...change}));
  }
  assert.equal(validateDevelopmentDatabase(valid).multipleStatements, false);
});
