'use strict';

// Prueba local y aislada: clientes virtuales, sin crear usuarios ni consultar PostgreSQL.
const { performance } = require('node:perf_hooks');

process.env.NODE_ENV = 'production';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_NAME = 'load_test_unused';
process.env.DB_USER = 'load_test_unused';
process.env.DB_PASSWORD = 'load_test_unused';
process.env.JWT_SECRET = 'local-only-load-test-secret-not-for-deployment';
process.env.DB_SSL = 'false';
process.env.CORS_ORIGIN = 'https://pt-hs.pages.dev';
process.env.TRUST_PROXY_HOPS = '1';
process.env.AUTH_COOKIE_SECURE = 'true';
process.env.AUTH_COOKIE_SAME_SITE = 'none';
process.env.AUTH_RATE_LIMIT_MAX = '20';
process.env.AUTH_RATE_LIMIT_IP_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const app = require('../src/app');
const users = Number(process.argv[2] || 300);
const concurrency = Number(process.argv[3] || Math.min(users, 100));
const origin = 'https://pt-hs.pages.dev';
const timings = [];
const failures = [];
const originalInfo = console.info;

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.ceil(sorted.length * ratio) - 1] || 0);
}

async function runUser(baseUrl, index) {
  const ip = `198.18.${Math.floor(index / 254)}.${(index % 254) + 1}`;
  const common = { Origin: origin, 'X-Forwarded-For': ip };
  const started = performance.now();
  const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, { headers: common });
  const token = csrf.headers.get('x-csrf-token');
  const cookie = csrf.headers.get('set-cookie')?.split(';')[0];
  if (csrf.status !== 204 || !token || !cookie?.includes(token)) {
    throw new Error(`CSRF bootstrap: HTTP ${csrf.status}`);
  }
  if (csrf.headers.get('access-control-allow-origin') !== origin ||
      csrf.headers.get('access-control-expose-headers') !== 'X-CSRF-Token' ||
      !csrf.headers.get('set-cookie').includes('Secure') ||
      !csrf.headers.get('set-cookie').includes('SameSite=None')) {
    throw new Error('CORS o atributos de cookie incorrectos');
  }

  // Token refresh deliberadamente invalido y corto: se detiene antes de acceder a la BD.
  const sessionCookie = `${cookie}; hidrosmart_refresh=invalid`;
  const accepted = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { ...common, Cookie: sessionCookie, 'X-CSRF-Token': token }
  });
  if (accepted.status !== 401) {
    throw new Error(`CSRF valido debio pasar hasta auth (401); HTTP ${accepted.status}`);
  }

  const rejected = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { ...common, Cookie: sessionCookie }
  });
  const rejectedBody = await rejected.json();
  if (rejected.status !== 403 || rejectedBody.error?.code !== 'CSRF_INVALID') {
    throw new Error(`CSRF faltante debio dar 403/CSRF_INVALID; HTTP ${rejected.status}`);
  }
  timings.push(performance.now() - started);
}

async function main() {
  if (!Number.isInteger(users) || users < 1 || users > 10000) {
    throw new Error('El numero de usuarios debe estar entre 1 y 10000');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > users) {
    throw new Error(`La concurrencia debe estar entre 1 y ${users}`);
  }
  console.info = () => {}; // evita 900 lineas de log HTTP en esta prueba local
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const started = performance.now();
    let nextUser = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (nextUser < users) {
        const index = nextUser++;
        await runUser(baseUrl, index).catch((error) => failures.push({
          user: index + 1,
          message: error.message,
          cause: error.cause?.code || error.cause?.message || null
        }));
      }
    }));
    const elapsed = performance.now() - started;
    const limiterStatuses = [];
    for (let index = 0; index < 300; index += 1) {
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { Origin: origin, 'X-Forwarded-For': '198.19.0.1' }
      });
      limiterStatuses.push(response.status);
    }
    originalInfo(`Usuarios virtuales: ${users}; concurrencia maxima: ${concurrency}`);
    originalInfo(`Solicitudes previstas: ${users * 3}`);
    originalInfo(`Flujos correctos: ${timings.length}/${users}`);
    originalInfo(`Duracion: ${Math.round(elapsed)} ms; p50: ${percentile(timings, 0.5)} ms; p95: ${percentile(timings, 0.95)} ms`);
    originalInfo(`IP compartida (300 refresh invalidos): ${limiterStatuses.filter((status) => status === 401).length} HTTP 401, ${limiterStatuses.filter((status) => status === 429).length} HTTP 429`);
    if (limiterStatuses.some((status) => status !== 401)) {
      failures.push({ user: 'shared-ip', message: 'Una IP compartida bloqueo clientes antes del limite amplio' });
      process.exitCode = 1;
    }
    if (failures.length) {
      originalInfo(`Primeros errores: ${JSON.stringify(failures.slice(0, 5))}`);
      process.exitCode = 1;
    }
    originalInfo(`Errores: ${failures.length}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.info = originalInfo;
  }
}

main().catch((error) => {
  console.info = originalInfo;
  console.error(error);
  process.exitCode = 1;
});
