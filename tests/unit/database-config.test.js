const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { getDatabaseConfig } = require('../../src/config/env');

test('una DATABASE_URL de PostgreSQL conserva TLS y usa las credenciales separadas del pool de ingesta', () => {
  const config = getDatabaseConfig({
    DATABASE_URL: 'postgresql://app-role:app-test-secret@db.example:5432/hidro_smart?sslmode=verify-full',
    DB_INGEST_USER: 'ingest-role',
    DB_INGEST_PASSWORD: 'ingest-test-secret',
    DB_POOL_MAX: '8',
    DB_INGEST_POOL_MAX: '3'
  });

  const appUrl = new URL(config.connectionString);
  const ingestUrl = new URL(config.ingest.connectionString);
  const appClient = new Client(config);
  const ingestClient = new Client({ ...config, ...config.ingest });

  assert.equal(appUrl.username, 'app-role');
  assert.equal(ingestUrl.username, 'ingest-role');
  assert.equal(ingestUrl.password, 'ingest-test-secret');
  assert.equal(ingestUrl.hostname, appUrl.hostname);
  assert.equal(ingestUrl.pathname, appUrl.pathname);
  assert.equal(ingestUrl.searchParams.get('sslmode'), 'verify-full');
  assert.equal(appClient.connectionParameters.user, 'app-role');
  assert.equal(ingestClient.connectionParameters.user, 'ingest-role');
  assert.equal(ingestClient.connectionParameters.password, 'ingest-test-secret');
  assert.ok(ingestClient.connectionParameters.ssl);
  assert.equal(config.max, 8);
  assert.equal(config.ingest.max, 3);
});

test('la configuración PostgreSQL rechaza credenciales de ingesta incompletas', () => {
  assert.throws(
    () => getDatabaseConfig({ DB_INGEST_USER: 'ingest-role' }),
    /DB_INGEST_USER y DB_INGEST_PASSWORD deben configurarse juntos/
  );
});

test('la conexión PostgreSQL productiva requiere TLS validado', () => {
  assert.throws(
    () => getDatabaseConfig({ NODE_ENV: 'production', DB_SSL: 'false' }),
    /debe usar TLS con validación de certificado/
  );
  assert.throws(
    () => getDatabaseConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://app-role:app-test-secret@db.example:5432/hidro_smart?sslmode=no-verify'
    }),
    /debe usar TLS con validación de certificado/
  );
  assert.throws(
    () => getDatabaseConfig({ NODE_ENV: 'production' }),
    /DB_SSL=true o un DATABASE_URL con TLS habilitado/
  );

  const directConfig = getDatabaseConfig({ NODE_ENV: 'production', DB_SSL: 'true' });
  assert.equal(directConfig.ssl, true);
  const urlConfig = getDatabaseConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app-role:app-test-secret@db.example:5432/hidro_smart?sslmode=verify-full'
  });
  assert.equal(urlConfig.connectionString.includes('sslmode=verify-full'), true);
  for (const sslmode of ['require', 'verify-ca']) {
    assert.throws(
      () => getDatabaseConfig({
        NODE_ENV: 'production',
        DATABASE_URL: `postgresql://app-role:app-test-secret@db.example:5432/hidro_smart?sslmode=${sslmode}`
      }),
      /debe usar TLS/
    );
  }
});
