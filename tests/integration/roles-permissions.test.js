const test = require('node:test');
const assert = require('node:assert/strict');

const apiUrl = process.env.INTEGRATION_API_URL || 'http://localhost:3000';
const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const baseEnabled = process.env.RUN_INTEGRATION === '1' && Boolean(databaseUrl);

const roleUsers = [
  {
    role: 'Administrator',
    email: process.env.INTEGRATION_ADMIN_EMAIL,
    password: process.env.INTEGRATION_ADMIN_PASSWORD,
    permissions: ['users.manage', 'roles.manage', 'audit.read'],
    checks: [
      { path: '/api/v1/users', status: 200 },
      { path: '/api/v1/support/tickets', status: 200 },
      { path: '/api/v1/audit/logs', status: 200 }
    ]
  },
  {
    role: 'HomeUser',
    email: process.env.INTEGRATION_HOMEUSER_EMAIL,
    password: process.env.INTEGRATION_HOMEUSER_PASSWORD,
    permissions: ['homes.manage', 'devices.manage', 'consumption.read'],
    checks: [
      { path: '/api/v1/homes', status: 200 },
      { path: '/api/v1/devices', status: 200 },
      { path: '/api/v1/users', status: 403 },
      { path: '/api/v1/audit/logs', status: 403 }
    ]
  },
  {
    role: 'Guest',
    email: process.env.INTEGRATION_GUEST_EMAIL,
    password: process.env.INTEGRATION_GUEST_PASSWORD,
    permissions: ['consumption.read', 'reports.read'],
    checks: [
      { path: '/api/v1/homes', status: 200 },
      { path: '/api/v1/devices', status: 200 },
      { path: '/api/v1/users', status: 403 },
      { path: '/api/v1/audit/logs', status: 403 }
    ]
  }
];

const enabled = baseEnabled && roleUsers.every(({ email, password }) => email && password);

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

function sessionHeaders(response) {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';', 1)[0]);
  const csrf = cookies.find((cookie) => cookie.startsWith('hidrosmart_csrf='))?.split('=', 2)[1];
  return { cookie: cookies.join('; '), ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}) };
}

test('matriz funcional de roles, permisos y rutas', { skip: !enabled }, async () => {
  for (const user of roleUsers) {
    const login = await requestJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    assert.equal(login.response.status, 200, `login ${user.role}`);
    assert.ok(login.body?.data?.sessionId, `session ${user.role}`);

    const headers = sessionHeaders(login.response);
    const profile = await requestJson('/api/v1/users/me', { headers });
    assert.equal(profile.response.status, 200, `perfil ${user.role}`);
    assert.ok(profile.body?.data?.roles?.includes(user.role), `rol ${user.role}`);
    for (const permission of user.permissions) {
      assert.ok(profile.body?.data?.permissions?.includes(permission), `${user.role}: ${permission}`);
    }

    if (user.role === 'Administrator') {
      const overview = await requestJson(`/api/v1/users/${profile.body.data.userId}/overview`, { headers });
      assert.equal(overview.response.status, 200, 'Administrator: /api/v1/users/:userId/overview');
      assert.ok(Array.isArray(overview.body?.data?.homes), 'Administrator: overview homes');
      assert.ok(Array.isArray(overview.body?.data?.devices), 'Administrator: overview devices');
    }

    for (const check of user.checks) {
      const result = await requestJson(check.path, { headers });
      assert.equal(result.response.status, check.status, `${user.role}: ${check.path}`);
    }

    const logout = await requestJson('/api/v1/auth/logout', {
      method: 'POST',
      headers
    });
    assert.equal(logout.response.status, 204, `logout ${user.role}`);
  }
});
