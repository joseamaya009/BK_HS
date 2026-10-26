const router = require('express').Router();
const { asyncHandler } = require('../shared/http');
const { authenticate } = require('./middleware/auth');
const { RegisterUser } = require('../core/application/use-cases/auth/RegisterUser');
const { LoginUser } = require('../core/application/use-cases/auth/LoginUser');
const { PostgresAuthRepository } = require('../core/infrastructure/repositories/postgres/PostgresAuthRepository');
const { BcryptPasswordHasher } = require('../core/infrastructure/security/BcryptPasswordHasher');
const { JwtTokenService } = require('../core/infrastructure/security/JwtTokenService');
const { AuthSessionService } = require('../core/application/services/auth/AuthSessionService');
const { PasswordTokenService } = require('../core/application/services/auth/PasswordTokenService');
const { ChangePassword } = require('../core/application/use-cases/auth/ChangePassword');
const { RequestPasswordReset } = require('../core/application/use-cases/auth/RequestPasswordReset');
const { ResetPassword } = require('../core/application/use-cases/auth/ResetPassword');
const { GetPasswordResetContext } = require('../core/application/use-cases/auth/GetPasswordResetContext');
const { ResendEmailVerification } = require('../core/application/use-cases/auth/ResendEmailVerification');
const { VerifyEmail } = require('../core/application/use-cases/auth/VerifyEmail');
const { NotificationService } = require('../core/application/services/notifications/NotificationService');
const { SmtpEmailSender } = require('../core/infrastructure/notifications/SmtpEmailSender');
const { getEnv } = require('../config/env');
const { AuthController } = require('./controllers/AuthController');
const { createAuthRateLimiter, createCredentialRateLimiter } = require('./middleware/authRateLimit');
const { getCookie, setCsrfCookie } = require('./security/authCookies');

const authRepository = new PostgresAuthRepository();
const passwordHasher = new BcryptPasswordHasher();
const passwordTokenService = new PasswordTokenService();
const env = getEnv();
const publicIpRateLimiter = createAuthRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitIpMax
});
const credentialLimit = () => createCredentialRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax
});
const loginRateLimiter = credentialLimit();
const registerRateLimiter = credentialLimit();
const passwordResetRateLimiter = credentialLimit();
const resendVerificationRateLimiter = credentialLimit();
const userRateLimiter = createAuthRateLimiter({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax,
  keyGenerator: (req) => `user:${req.user.id}`
});
const notificationService = new NotificationService({
  sender: new SmtpEmailSender({
    smtp: env.smtp,
    resend: env.resend,
    brevo: env.brevo
  }),
  frontendUrl: env.frontendUrl,
  passwordResetUrl: env.passwordResetUrl
});
const authController = new AuthController({
  registerUser: new RegisterUser({
    authRepository,
    passwordHasher,
    tokenService: passwordTokenService,
    notificationService
  }),
  loginUser: new LoginUser({ authRepository, passwordHasher }),
  sessionService: new AuthSessionService({ authRepository, tokenService: new JwtTokenService() }),
  changePassword: new ChangePassword({ authRepository, passwordHasher, notificationService }),
  requestPasswordReset: new RequestPasswordReset({ authRepository, tokenService: passwordTokenService, notificationService }),
  resetPassword: new ResetPassword({ authRepository, passwordHasher, tokenService: passwordTokenService, notificationService }),
  getPasswordResetContext: new GetPasswordResetContext({ authRepository, tokenService: passwordTokenService }),
  resendEmailVerification: new ResendEmailVerification({ authRepository, tokenService: passwordTokenService, notificationService }),
  verifyEmail: new VerifyEmail({ authRepository, tokenService: passwordTokenService }),
  notificationService,
  authCookies: env.authCookies
});

router.get('/csrf', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  setCsrfCookie(res, env.authCookies, getCookie(_req, env.authCookies.csrfTokenName));
  res.status(204).end();
});

router.post('/register', publicIpRateLimiter, registerRateLimiter, asyncHandler((req, res) => authController.register(req, res)));
router.post('/login', publicIpRateLimiter, loginRateLimiter, asyncHandler((req, res) => authController.login(req, res)));
router.post('/refresh', publicIpRateLimiter, asyncHandler((req, res) => authController.refresh(req, res)));
router.post('/logout', authenticate, asyncHandler((req, res) => authController.logout(req, res)));
router.get('/sessions', authenticate, asyncHandler((req, res) => authController.listSessions(req, res)));
router.delete('/sessions/:sessionId', authenticate, asyncHandler((req, res) => authController.revokeSession(req, res)));
router.post('/sessions/revoke-others', authenticate, asyncHandler((req, res) => authController.revokeOtherSessions(req, res)));
router.post('/sessions/revoke-all', authenticate, asyncHandler((req, res) => authController.revokeAllSessions(req, res)));
router.post('/change-password', authenticate, userRateLimiter, asyncHandler((req, res) => authController.change(req, res)));
router.post('/request-password-reset', publicIpRateLimiter, passwordResetRateLimiter, asyncHandler((req, res) => authController.requestReset(req, res)));
router.get('/password-reset-context', publicIpRateLimiter, asyncHandler((req, res) => authController.passwordResetContext(req, res)));
router.post('/resend-verification', publicIpRateLimiter, resendVerificationRateLimiter, asyncHandler((req, res) => authController.resendVerification(req, res)));
router.post('/verify-email', publicIpRateLimiter, asyncHandler((req, res) => authController.verify(req, res)));
router.post('/reset-password', publicIpRateLimiter, asyncHandler((req, res) => authController.reset(req, res)));

module.exports = router;
