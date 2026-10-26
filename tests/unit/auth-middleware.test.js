const test = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, {
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || '5432',
  DB_NAME: process.env.DB_NAME || 'unit_test',
  DB_USER: process.env.DB_USER || 'unit_test',
  DB_PASSWORD: process.env.DB_PASSWORD || 'unit_test',
  JWT_SECRET: process.env.JWT_SECRET || 'unit-test-secret'
});
const { createAuthenticate } = require('../../src/api/middleware/auth');

function request() {
  return { headers: { cookie: 'hidrosmart_access=valid-token' } };
}

const payload = {
  sub: '123e4567-e89b-12d3-a456-426614174000',
  sid: '123e4567-e89b-12d3-a456-426614174001'
};

async function execute(authenticate, req = request()) {
  let result;
  await authenticate(req, {}, (error) => { result = error; });
  return { req, result };
}

test('autentica una sesión activa', async () => {
  const authenticate = createAuthenticate({
    accessTokenName: 'hidrosmart_access',
    tokenService: { verify: () => payload },
    authRepository: { isSessionActive: async () => true }
  });
  const { req, result } = await execute(authenticate);
  assert.equal(result, undefined);
  assert.deepEqual(req.user, { id: payload.sub, sessionId: payload.sid });
});

test('rechaza token inválido y sesión revocada con 401', async () => {
  const invalidToken = createAuthenticate({
    accessTokenName: 'hidrosmart_access',
    tokenService: { verify: () => { throw new Error('invalid'); } },
    authRepository: { isSessionActive: async () => true }
  });
  const revoked = createAuthenticate({
    accessTokenName: 'hidrosmart_access',
    tokenService: { verify: () => payload },
    authRepository: { isSessionActive: async () => false }
  });
  assert.equal((await execute(invalidToken)).result.status, 401);
  assert.equal((await execute(revoked)).result.status, 401);
});

test('no confunde una caída de PostgreSQL con una sesión revocada', async () => {
  const databaseError = new Error('database unavailable');
  const authenticate = createAuthenticate({
    accessTokenName: 'hidrosmart_access',
    tokenService: { verify: () => payload },
    authRepository: { isSessionActive: async () => { throw databaseError; } }
  });
  const { result } = await execute(authenticate);
  assert.equal(result, databaseError);
});
