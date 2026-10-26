const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthController } = require('../../src/api/controllers/AuthController');
const {
  createCsrfProtection,
  getCookie,
  setSessionCookies
} = require('../../src/api/security/authCookies');

const authCookies = {
  accessTokenName: 'hidrosmart_access',
  refreshTokenName: 'hidrosmart_refresh',
  csrfTokenName: 'hidrosmart_csrf',
  csrfHeaderName: 'X-CSRF-Token',
  secure: false,
  sameSite: 'lax',
  refreshMaxAgeMs: 86_400_000
};

function cookieResponse() {
  return {
    cookies: [],
    cleared: [],
    headers: {},
    cookie(name, value, options) { this.cookies.push({ name, value, options }); },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    clearCookie(name) { this.cleared.push(name); },
    status(code) { this.statusCode = code; return this; },
    send() { this.sent = true; },
    json(payload) { this.payload = payload; }
  };
}

test('guarda access y refresh solo en cookies HttpOnly y no en la respuesta de login', async () => {
  const controller = new AuthController({
    loginUser: { execute: async () => ({ userId: '123e4567-e89b-12d3-a456-426614174000' }) },
    sessionService: {
      create: async () => ({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sessionId: '123e4567-e89b-12d3-a456-426614174001',
        accessToken: 'access-secret',
        refreshToken: 'refresh-secret',
        refreshExpiresAt: '2026-11-01T00:00:00.000Z'
      })
    },
    authCookies
  });
  const res = cookieResponse();

  await controller.login({ body: { login: 'owner@example.test', password: 'Password123!' }, ip: '127.0.0.1', get: () => null }, res);

  assert.equal(res.cookies.length, 3);
  assert.equal(res.cookies.find((cookie) => cookie.name === authCookies.accessTokenName).options.httpOnly, true);
  assert.equal(res.cookies.find((cookie) => cookie.name === authCookies.refreshTokenName).options.httpOnly, true);
  assert.equal(res.cookies.find((cookie) => cookie.name === authCookies.csrfTokenName).options.httpOnly, false);
  assert.equal(
    res.headers[authCookies.csrfHeaderName.toLowerCase()],
    res.cookies.find((cookie) => cookie.name === authCookies.csrfTokenName).value
  );
  assert.equal(res.payload.data.accessToken, undefined);
  assert.equal(res.payload.data.refreshToken, undefined);
  assert.equal(res.payload.data.sessionId, '123e4567-e89b-12d3-a456-426614174001');
});

test('logout revoca la sesión autenticada antes de limpiar las cookies', async () => {
  const calls = [];
  const controller = new AuthController({
    sessionService: { revokeSession: async (input) => calls.push(input) },
    authCookies
  });
  const res = cookieResponse();
  const user = { id: '123e4567-e89b-12d3-a456-426614174000', sessionId: '123e4567-e89b-12d3-a456-426614174001' };

  await controller.logout({ user, headers: {} }, res);

  assert.deepEqual(calls, [{ userId: user.id, sessionId: user.sessionId }]);
  assert.deepEqual(res.cleared, ['hidrosmart_access', 'hidrosmart_refresh', 'hidrosmart_csrf']);
  assert.equal(res.statusCode, 204);
});

test('logout no aparenta éxito ni limpia cookies si falla la base de datos', async () => {
  const controller = new AuthController({
    sessionService: { revokeSession: async () => { throw new Error('database unavailable'); } },
    authCookies
  });
  const res = cookieResponse();

  await assert.rejects(
    controller.logout({ user: { id: 'u', sessionId: 's' }, headers: {} }, res),
    /database unavailable/
  );
  assert.deepEqual(res.cleared, []);
  assert.equal(res.statusCode, undefined);
});

test('emite el token CSRF en cookie y encabezado para clientes cross-origin', () => {
  const { setCsrfCookie } = require('../../src/api/security/authCookies');
  const res = cookieResponse();
  const token = setCsrfCookie(res, authCookies);
  const csrfCookie = res.cookies.find((cookie) => cookie.name === authCookies.csrfTokenName);

  assert.equal(csrfCookie.value, token);
  assert.equal(csrfCookie.options.httpOnly, false);
  assert.equal(res.headers[authCookies.csrfHeaderName.toLowerCase()], token);
  assert.equal(token.length >= 40, true);
});

test('conserva un token CSRF existente cuando se renuevan las cookies de sesión', () => {
  const res = cookieResponse();
  const existingToken = 'a'.repeat(43);

  setSessionCookies(res, { accessToken: 'new-access', refreshToken: 'new-refresh' }, authCookies, existingToken);

  assert.equal(
    res.cookies.find((cookie) => cookie.name === authCookies.csrfTokenName).value,
    existingToken
  );
  assert.equal(res.headers[authCookies.csrfHeaderName.toLowerCase()], existingToken);
});

test('protege peticiones con cookies frente a CSRF y no bloquea clientes Bearer', async () => {
  const protection = createCsrfProtection(authCookies);
  const res = cookieResponse();
  const csrf = 'token-csrf-seguro';
  setSessionCookies(res, {
    accessToken: 'access',
    refreshToken: 'refresh'
  }, authCookies);
  const sessionCookie = `${authCookies.accessTokenName}=access; ${authCookies.csrfTokenName}=${csrf}`;

  const rejected = await new Promise((resolve) => protection({
    method: 'DELETE',
    headers: { cookie: sessionCookie },
    get: () => null
  }, {}, resolve));
  assert.equal(rejected.status, 403);
  assert.equal(rejected.publicCode, 'CSRF_INVALID');

  const allowed = await new Promise((resolve) => protection({
    method: 'PATCH',
    headers: { cookie: sessionCookie },
    get: (name) => name === authCookies.csrfHeaderName ? csrf : null
  }, {}, resolve));
  assert.equal(allowed, undefined);

  const bearerAllowed = await new Promise((resolve) => protection({
    method: 'POST',
    headers: { authorization: 'Bearer a-token' },
    get: () => null
  }, {}, resolve));
  assert.equal(bearerAllowed, undefined);
  assert.equal(getCookie({ headers: { cookie: sessionCookie } }, authCookies.csrfTokenName), csrf);
});
