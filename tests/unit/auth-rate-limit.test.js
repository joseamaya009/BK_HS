const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAuthRateLimiter, createCredentialRateLimiter } = require('../../src/api/middleware/authRateLimit');

test('limita solicitudes de autenticación y conserva el contrato de errores', async () => {
  const app = express();
  app.use(createAuthRateLimiter({ windowMs: 60_000, limit: 1 }));
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const first = await fetch(`http://127.0.0.1:${port}/`);
    const second = await fetch(`http://127.0.0.1:${port}/`);
    const body = await second.json();

    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(body.error.code, 'TOO_MANY_REQUESTS');
    assert.ok(body.meta.requestId);
    assert.equal(second.headers.get('x-request-id'), body.meta.requestId);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('permite varias cuentas desde una IP, pero limita intentos por cuenta y por red', async () => {
  const app = express();
  app.use(express.json());
  app.post('/login',
    createAuthRateLimiter({ windowMs: 60_000, limit: 4 }),
    createCredentialRateLimiter({ windowMs: 60_000, limit: 2 }),
    (_req, res) => res.sendStatus(200)
  );
  const server = app.listen(0);

  try {
    const url = `http://127.0.0.1:${server.address().port}/login`;
    const login = (identifier) => fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ login: identifier })
    });

    assert.equal((await login('ana@example.com')).status, 200);
    assert.equal((await login('ANA@example.com')).status, 200);
    assert.equal((await login('ana@example.com')).status, 429);
    assert.equal((await login('bea@example.com')).status, 200);
    assert.equal((await login('car@example.com')).status, 429);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
