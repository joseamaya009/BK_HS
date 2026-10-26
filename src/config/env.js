const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

function getTrustProxyHops(value) {
  if (value === undefined || value === '') return 0;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
    throw new Error('TRUST_PROXY_HOPS debe ser un entero entre 0 y 5');
  }
  return parsed;
}

function getBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error('Las variables booleanas deben ser true o false');
}

function getPositiveInteger(value, name, fallback) {
  const parsed = Number(value === undefined || value === '' ? fallback : value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} debe ser un entero positivo`);
  }
  return parsed;
}

function getCookieSameSite(value) {
  const normalized = (value || 'lax').toLowerCase();

  if (!['lax', 'strict', 'none'].includes(normalized)) {
    throw new Error('AUTH_COOKIE_SAME_SITE debe ser lax, strict o none');
  }

  return normalized;
}

function getDurationMs(value, name) {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(value || '');

  if (!match) {
    throw new Error(
      `${name} debe tener formato 30d, 12h, 15m, 30s o 100ms`
    );
  }

  const factors = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  return Number(match[1]) * factors[match[2].toLowerCase()];
}

function validateDatabaseUrlSsl(databaseUrl, sslEnabled) {
  if (!databaseUrl || !sslEnabled) return;

  const params = new URL(databaseUrl).searchParams;
  const sslMode = (params.get('sslmode') || '').toLowerCase();
  const sslOption = (params.get('ssl') || '').toLowerCase();
  const useLibpqCompat = params.get('uselibpqcompat') === 'true';
  const disablesSsl = sslMode === 'disable' || ['0', 'false'].includes(sslOption);
  const disablesCertificateValidation =
    sslMode === 'no-verify' ||
    sslOption === 'no-verify' ||
    (useLibpqCompat && ['prefer', 'require', 'verify-ca'].includes(sslMode));

  if (disablesSsl || disablesCertificateValidation) {
    throw new Error(
      'DATABASE_URL no debe desactivar TLS ni la validacion del certificado cuando DB_SSL=true'
    );
  }
}

function getEnv() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  const missing = required.filter(
    (key) =>
      ![
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD'
      ].includes(key) && !process.env[key]
  );

  if (!hasDatabaseUrl) {
    missing.push(
      ...[
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD'
      ].filter((key) => !process.env[key])
    );
  }

  if (missing.length) {
    throw new Error(
      `Faltan variables de entorno: ${[...new Set(missing)].join(', ')}`
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  const cookieSecure = getBoolean(
    process.env.AUTH_COOKIE_SECURE,
    nodeEnv === 'production'
  );

  const cookieSameSite = getCookieSameSite(
    process.env.AUTH_COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax')
  );

  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error(
      'AUTH_COOKIE_SECURE debe ser true cuando AUTH_COOKIE_SAME_SITE=none'
    );
  }

  // SSL habilitado por defecto en produccion (Neon).
  // En desarrollo local permanece deshabilitado.
  const dbSslEnabled = getBoolean(
    process.env.DB_SSL,
    nodeEnv === 'production'
  );

  validateDatabaseUrlSsl(process.env.DATABASE_URL, dbSslEnabled);

  const dbSsl = dbSslEnabled
    ? { rejectUnauthorized: true }
    : false;

  return {
    nodeEnv,

    port: Number(process.env.PORT || 3000),

    trustProxyHops: getTrustProxyHops(
      process.env.TRUST_PROXY_HOPS
    ),

    corsOrigin:
      process.env.CORS_ORIGIN || 'http://localhost:5173',

    frontendUrl:
      process.env.FRONTEND_URL || 'http://localhost:5173',

    brevo: {
      apiKey: process.env.BREVO_API_KEY,
      fromEmail: process.env.BREVO_FROM_EMAIL,
      fromName: process.env.BREVO_FROM_NAME || 'HidroSmart'
    },

    resend: {
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM
    },

    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    },

    passwordResetUrl:
      process.env.PASSWORD_RESET_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173',

    materializedViewsRefreshMs: Number(
      process.env.MATERIALIZED_VIEWS_REFRESH_MS || 300000
    ),

    alertGenerationIntervalMs: Number(
      process.env.ALERT_GENERATION_INTERVAL_MS || 300000
    ),

    auditCleanupIntervalMs: Number(
      process.env.AUDIT_CLEANUP_INTERVAL_MS || 86400000
    ),

    auditRetentionDays: Number(
      process.env.AUDIT_RETENTION_DAYS || 365
    ),

    auditCleanupBatchSize: Number(
      process.env.AUDIT_CLEANUP_BATCH_SIZE || 1000
    ),

    actuatorCommandTimeoutMs: Number(
      process.env.ACTUATOR_COMMAND_TIMEOUT_MS || 60000
    ),

    actuatorCommandTimeoutBatchSize: Number(
      process.env.ACTUATOR_COMMAND_TIMEOUT_BATCH_SIZE || 100
    ),

    authRateLimitWindowMs: getPositiveInteger(
      process.env.AUTH_RATE_LIMIT_WINDOW_MS, 'AUTH_RATE_LIMIT_WINDOW_MS', 900000
    ),

    authRateLimitMax: getPositiveInteger(
      process.env.AUTH_RATE_LIMIT_MAX, 'AUTH_RATE_LIMIT_MAX', 20
    ),

    authRateLimitIpMax: getPositiveInteger(
      process.env.AUTH_RATE_LIMIT_IP_MAX, 'AUTH_RATE_LIMIT_IP_MAX', 1000
    ),

    authCookies: {
      accessTokenName:
        process.env.AUTH_ACCESS_COOKIE_NAME || 'hidrosmart_access',

      refreshTokenName:
        process.env.AUTH_REFRESH_COOKIE_NAME || 'hidrosmart_refresh',

      csrfTokenName:
        process.env.AUTH_CSRF_COOKIE_NAME || 'hidrosmart_csrf',

      csrfHeaderName:
        process.env.AUTH_CSRF_HEADER_NAME || 'X-CSRF-Token',

      secure: cookieSecure,

      sameSite: cookieSameSite,

      domain: process.env.AUTH_COOKIE_DOMAIN || undefined,

      refreshMaxAgeMs: getDurationMs(
        process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        'JWT_REFRESH_EXPIRES_IN'
      )
    },

    // PostgreSQL: configuracion compartida por pool e ingestPool
    db: {
      ...(hasDatabaseUrl
        ? { connectionString: process.env.DATABASE_URL }
        : {}),

      host: process.env.DB_HOST,

      port: Number(process.env.DB_PORT),

      database: process.env.DB_NAME,

      user: process.env.DB_USER,

      password: process.env.DB_PASSWORD,

      // TLS habilitado en produccion con validacion de certificado.
      ssl: dbSsl,

      max: Number(process.env.DB_POOL_MAX || 10),

      ingest: {
        user:
          process.env.DB_INGEST_USER || process.env.DB_USER,

        password:
          process.env.DB_INGEST_PASSWORD || process.env.DB_PASSWORD,

        max: Number(
          process.env.DB_INGEST_POOL_MAX ||
          process.env.DB_POOL_MAX ||
          5
        )
      }
    },

    jwt: {
      secret: process.env.JWT_SECRET,

      expiresIn:
        process.env.JWT_EXPIRES_IN || '15m',

      refreshExpiresIn:
        process.env.JWT_REFRESH_EXPIRES_IN || '30d',

      issuer:
        process.env.JWT_ISSUER || 'hidro-smart-api',

      audience:
        process.env.JWT_AUDIENCE || 'hidro-smart-web'
    }
  };
}

module.exports = { getEnv };
