const { Pool } = require('pg');
const { getEnv } = require('../config/env');

const fs = require('fs');

const config = getEnv();

const sslConfig = process.env.DB_SSL_CA
  ? {
      ca: fs.readFileSync(process.env.DB_SSL_CA, 'utf8'),
      rejectUnauthorized: true
    }
  : config.db.ssl;

const dbConfig = {
  ...config.db,
  ...(sslConfig ? { ssl: sslConfig } : {})
};

const pool = new Pool(dbConfig);

const ingestPool = new Pool({
  ...dbConfig,
  ...config.db.ingest,
  ...(sslConfig ? { ssl: sslConfig } : {})
});

pool.on('error', (error) => {
  console.error('Error inesperado del pool PostgreSQL:', error.message);
});

ingestPool.on('error', (error) => {
  console.error('Error inesperado del pool PostgreSQL de ingesta:', error.message);
});

async function withTransaction(userId, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function withIngestTransaction(callback) {
  const client = await ingestPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, ingestPool, withTransaction, withIngestTransaction };
