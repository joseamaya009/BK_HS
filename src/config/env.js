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

function getCookieSameSite(value) {
  const normalized = (value || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(normalized)) {
    throw new Error('AUTH_COOKIE_SAME_SITE debe ser lax, strict o none');
  }
  return normalized;
}

function getDurationMs(value, name) {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(value || '');
  if (!match) throw new Error(`${name} debe tener formato 30d, 12h, 15m, 30s o 100ms`);
  const factors = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * factors[match[2].toLowerCase()];
}

function getIngestDatabaseUrl(databaseUrl, username, password) {
  if (!databaseUrl || !username || !password) return undefined;

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch (_error) {
    throw new Error('DATABASE_URL debe ser una URL PostgreSQL válida para separar las credenciales de ingesta');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL debe usar el protocolo postgres:// o postgresql://');
  }

  parsedUrl.username = username;
  parsedUrl.password = password;
  return parsedUrl.toString();
}

function getDatabaseUrlSsl(databaseUrl) {
  if (!databaseUrl) return undefined;

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch (_error) {
    return false;
  }

  const sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase();
  if (sslMode) return ['require', 'verify-ca', 'verify-full'].includes(sslMode);

  const ssl = parsedUrl.searchParams.get('ssl')?.toLowerCase();
  if (ssl) return ['true', '1'].includes(ssl);

  if (parsedUrl.searchParams.has('sslrootcert') || parsedUrl.searchParams.has('sslcert')) return true;
  return undefined;
}

function getDatabaseConfig(env = process.env) {
  if (Boolean(env.DB_INGEST_USER) !== Boolean(env.DB_INGEST_PASSWORD)) {
    throw new Error('DB_INGEST_USER y DB_INGEST_PASSWORD deben configurarse juntos');
  }

  const ssl = getBoolean(env.DB_SSL, undefined, 'DB_SSL');
  const urlSsl = env.NODE_ENV === 'production' ? getDatabaseUrlSsl(env.DATABASE_URL) : undefined;
  if (env.NODE_ENV === 'production' && (ssl === false || urlSsl === false)) {
    throw new Error('En producción PostgreSQL debe usar TLS con validación de certificado; no uses DB_SSL=false ni sslmode=disable/no-verify');
  }
  if (env.NODE_ENV === 'production' && ssl !== true && urlSsl !== true) {
    throw new Error('En producción configura DB_SSL=true o un DATABASE_URL con TLS habilitado');
  }

  const ingestUser = env.DB_INGEST_USER || env.DB_USER;
  const ingestPassword = env.DB_INGEST_PASSWORD || env.DB_PASSWORD;
  const ingestDatabaseUrl = getIngestDatabaseUrl(env.DATABASE_URL, ingestUser, ingestPassword);

  return {
    ...(env.DATABASE_URL ? { connectionString: env.DATABASE_URL } : {}),
    ...(ssl === undefined ? {} : { ssl }),
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max: Number(env.DB_POOL_MAX || 10),
    ingest: {
      ...(ingestDatabaseUrl ? { connectionString: ingestDatabaseUrl } : {}),
      user: ingestUser,
      password: ingestPassword,
      max: Number(env.DB_INGEST_POOL_MAX || env.DB_POOL_MAX || 5)
    }
  };
}

function getEnv() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const missing = required.filter((key) => key !== 'DB_HOST' && key !== 'DB_PORT' && key !== 'DB_NAME' && key !== 'DB_USER' && key !== 'DB_PASSWORD' && !process.env[key]);
  if (!hasDatabaseUrl) {
    missing.push(...['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter((key) => !process.env[key]));
  }
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${[...new Set(missing)].join(', ')}`);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const cookieSecure = getBoolean(process.env.AUTH_COOKIE_SECURE, nodeEnv === 'production');
  const cookieSameSite = getCookieSameSite(process.env.AUTH_COOKIE_SAME_SITE);
  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('AUTH_COOKIE_SECURE debe ser true cuando AUTH_COOKIE_SAME_SITE=none');
  }
  return {
    nodeEnv,
    port: Number(process.env.PORT || 3000),
    trustProxyHops: getTrustProxyHops(process.env.TRUST_PROXY_HOPS),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    },
    passwordResetUrl: process.env.PASSWORD_RESET_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
    materializedViewsRefreshMs: Number(process.env.MATERIALIZED_VIEWS_REFRESH_MS || 300000),
    alertGenerationIntervalMs: Number(process.env.ALERT_GENERATION_INTERVAL_MS || 300000),
    auditCleanupIntervalMs: Number(process.env.AUDIT_CLEANUP_INTERVAL_MS || 86400000),
    auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 365),
    auditCleanupBatchSize: Number(process.env.AUDIT_CLEANUP_BATCH_SIZE || 1000),
    actuatorCommandTimeoutMs: Number(process.env.ACTUATOR_COMMAND_TIMEOUT_MS || 60000),
    actuatorCommandTimeoutBatchSize: Number(process.env.ACTUATOR_COMMAND_TIMEOUT_BATCH_SIZE || 100),
    authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    authCookies: {
      accessTokenName: process.env.AUTH_ACCESS_COOKIE_NAME || 'hidrosmart_access',
      refreshTokenName: process.env.AUTH_REFRESH_COOKIE_NAME || 'hidrosmart_refresh',
      csrfTokenName: process.env.AUTH_CSRF_COOKIE_NAME || 'hidrosmart_csrf',
      csrfHeaderName: process.env.AUTH_CSRF_HEADER_NAME || 'X-CSRF-Token',
      secure: cookieSecure,
      sameSite: cookieSameSite,
      domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
      refreshMaxAgeMs: getDurationMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d', 'JWT_REFRESH_EXPIRES_IN')
    },
    db: getDatabaseConfig(process.env),
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: process.env.JWT_ISSUER || 'hidro-smart-api',
      audience: process.env.JWT_AUDIENCE || 'hidro-smart-web'
    }
  };
}

module.exports = { getEnv, getDatabaseConfig, getIngestDatabaseUrl, getDatabaseUrlSsl };
