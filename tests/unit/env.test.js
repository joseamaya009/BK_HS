const test = require('node:test');
const assert = require('node:assert/strict');
const { getEnv } = require('../../src/config/env');

const envKeys = [
  'NODE_ENV',
  'AUTH_COOKIE_SECURE',
  'AUTH_COOKIE_SAME_SITE',
  'DB_SSL',
  'DATABASE_URL',
  'BREVO_API_KEY',
  'BREVO_FROM_EMAIL',
  'BREVO_FROM_NAME',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'AUTH_COOKIE_SECURE',
  'AUTH_COOKIE_SAME_SITE',
  'JWT_REFRESH_EXPIRES_IN',
  'AUTH_RATE_LIMIT_MAX',
  'AUTH_RATE_LIMIT_WINDOW_MS',
  'AUTH_RATE_LIMIT_IP_MAX'
];

function withEnv(overrides, callback) {
  const original = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]])
  );

  for (const key of envKeys) delete process.env[key];

  Object.assign(process.env, {
    DB_HOST: 'db.example.invalid',
    DB_PORT: '5432',
    DB_NAME: 'hidro_smart',
    DB_USER: 'hidro_app',
    DB_PASSWORD: 'test-password',
    JWT_SECRET: 'test-secret-long-enough',
    ...overrides
  });

  try {
    callback();
  } finally {
    for (const key of envKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test('activa SSL con validacion de certificado por defecto en produccion', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    assert.deepEqual(getEnv().db.ssl, { rejectUnauthorized: true });
    assert.equal(getEnv().authCookies.secure, true);
    assert.equal(getEnv().authCookies.sameSite, 'none');
  });
});

test('mantiene SSL desactivado por defecto en desarrollo y Docker local', () => {
  withEnv({ NODE_ENV: 'development' }, () => {
    assert.equal(getEnv().db.ssl, false);
    assert.equal(getEnv().authCookies.sameSite, 'lax');
  });
});

test('separa la cuota amplia por IP de la cuota por cuenta', () => {
  withEnv({}, () => {
    assert.equal(getEnv().authRateLimitMax, 20);
    assert.equal(getEnv().authRateLimitIpMax, 1000);
  });
  withEnv({ AUTH_RATE_LIMIT_IP_MAX: '1500' }, () => {
    assert.equal(getEnv().authRateLimitIpMax, 1500);
  });
  withEnv({ AUTH_RATE_LIMIT_IP_MAX: '0' }, () => {
    assert.throws(() => getEnv(), /AUTH_RATE_LIMIT_IP_MAX debe ser un entero positivo/);
  });
});

test('permite configurar DB_SSL de forma explicita y valida', () => {
  withEnv({ NODE_ENV: 'production', DB_SSL: 'false' }, () => {
    assert.equal(getEnv().db.ssl, false);
  });

  withEnv({ NODE_ENV: 'development', DB_SSL: 'true' }, () => {
    assert.deepEqual(getEnv().db.ssl, { rejectUnauthorized: true });
  });

  withEnv({ NODE_ENV: 'production', DB_SSL: 'maybe' }, () => {
    assert.throws(() => getEnv(), /true o false/);
  });
});

test('rechaza DATABASE_URL que desactiva TLS en produccion', () => {
  for (const query of [
    'sslmode=disable',
    'sslmode=no-verify',
    'ssl=0',
    'ssl=no-verify',
    'uselibpqcompat=true&sslmode=require'
  ]) {
    withEnv(
      {
        NODE_ENV: 'production',
        DATABASE_URL: `postgresql://user:pass@db.example.invalid/hidro?${query}`
      },
      () => {
        assert.throws(() => getEnv(), /no debe desactivar TLS/);
      }
    );
  }
});

test('acepta el sslmode=require habitual de Neon', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@db.example.invalid/hidro?sslmode=require'
    },
    () => {
      assert.deepEqual(getEnv().db.ssl, { rejectUnauthorized: true });
    }
  );
});

test('expone las variables opcionales del proveedor Resend', () => {
  withEnv(
    {
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM: 'HidroSmart <onboarding@resend.dev>'
    },
    () => {
      assert.deepEqual(getEnv().resend, {
        apiKey: 're_test_key',
        from: 'HidroSmart <onboarding@resend.dev>'
      });
    }
  );
});

test('expone la configuración opcional del proveedor Brevo', () => {
  withEnv(
    {
      BREVO_API_KEY: 'xkeysib-test-key',
      BREVO_FROM_EMAIL: 'notificaciones@example.com',
      BREVO_FROM_NAME: 'HidroSmart QA'
    },
    () => {
      assert.deepEqual(getEnv().brevo, {
        apiKey: 'xkeysib-test-key',
        fromEmail: 'notificaciones@example.com',
        fromName: 'HidroSmart QA'
      });
    }
  );
});

test('usa HidroSmart como nombre remitente predeterminado de Brevo', () => {
  withEnv({ BREVO_FROM_EMAIL: 'notificaciones@example.com' }, () => {
    assert.equal(getEnv().brevo.fromName, 'HidroSmart');
  });
});
