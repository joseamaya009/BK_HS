const { createHash, randomUUID } = require('node:crypto');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

function createAuthRateLimiter({ windowMs = 15 * 60 * 1000, limit = 20, keyGenerator } = {}) {
  return rateLimit({
    windowMs,
    limit,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res) {
      const requestId = req.id || req.headers['x-request-id'] || randomUUID();
      res.setHeader('X-Request-Id', requestId);
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Demasiadas solicitudes de autenticación. Intenta nuevamente más tarde.'
        },
        meta: { requestId }
      });
    }
  });
}

function createCredentialRateLimiter(options) {
  return createAuthRateLimiter({
    ...options,
    keyGenerator(req) {
      const identifier = String(req.body?.login || req.body?.email || '').trim().toLowerCase();
      // Las peticiones malformadas comparten la cuota de su IP; no guardamos
      // correos ni nombres de usuario en las claves del limitador.
      const value = identifier || `missing:${ipKeyGenerator(req.ip)}`;
      return `credential:${createHash('sha256').update(value).digest('hex')}`;
    }
  });
}

module.exports = { createAuthRateLimiter, createCredentialRateLimiter };
