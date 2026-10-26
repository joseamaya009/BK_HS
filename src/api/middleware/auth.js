const { JwtTokenService } = require('../../core/infrastructure/security/JwtTokenService');
const { PostgresAuthRepository } = require('../../core/infrastructure/repositories/postgres/PostgresAuthRepository');
const { getCookie } = require('../security/authCookies');
const { getEnv } = require('../../config/env');

const tokenService = new JwtTokenService();
const authRepository = new PostgresAuthRepository();

function createAuthenticate({ tokenService, authRepository, accessTokenName }) {
  return async (req, _res, next) => {
    const cookieToken = getCookie(req, accessTokenName || getEnv().authCookies.accessTokenName);
    const header = req.headers.authorization || '';
    const match = /^Bearer\s+([^\s]+)$/i.exec(header);
    const token = cookieToken || match?.[1];
    if (!token || token.length > 4096) {
      const error = new Error('Se requiere una sesion autenticada');
      error.status = 401;
      return next(error);
    }

    let payload;
    try {
      payload = tokenService.verify(token);
    } catch (_error) {
      const error = new Error('Token inválido o expirado');
      error.status = 401;
      return next(error);
    }

    if (!payload.sid) {
      const error = new Error('La sesión ya no está activa');
      error.status = 401;
      return next(error);
    }

    try {
      const active = await authRepository.isSessionActive({ userId: payload.sub, sessionId: payload.sid });
      if (!active) {
        const error = new Error('La sesión ya no está activa');
        error.status = 401;
        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    req.user = { id: payload.sub, sessionId: payload.sid };
    return next();
  };
}

const authenticate = createAuthenticate({ tokenService, authRepository });

module.exports = { authenticate, createAuthenticate };
