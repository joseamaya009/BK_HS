const nodemailer = require('nodemailer');

class SmtpEmailSender {
  constructor({
    smtp = {},
    brevo = {},
    resend = {},
    transportFactory = nodemailer.createTransport,
    fetchImpl = globalThis.fetch,
    logger = console
  }) {
    this.smtp = smtp;
    this.brevo = brevo;
    this.resend = resend;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    this.provider = brevo.apiKey ? 'brevo' : resend.apiKey ? 'resend' : 'smtp';

    if (this.provider === 'smtp') {
      const transportOptions = {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure
      };

      if (smtp.user || smtp.password) {
        transportOptions.auth = { user: smtp.user, pass: smtp.password };
      }

      this.transporter = transportFactory(transportOptions);
    }
  }

  configurationStatus() {
    if (this.provider === 'brevo') {
      const missing = [];
      if (typeof this.brevo.apiKey !== 'string' || !this.brevo.apiKey.trim()) {
        missing.push('BREVO_API_KEY');
      }
      if (typeof this.brevo.fromEmail !== 'string' || !this.brevo.fromEmail.trim()) {
        missing.push('BREVO_FROM_EMAIL');
      }
      return { configured: missing.length === 0, missing, provider: this.provider };
    }
    if (this.provider === 'resend') {
      const missing = [];
      if (typeof this.resend.apiKey !== 'string' || !this.resend.apiKey.trim()) {
        missing.push('RESEND_API_KEY');
      }
      if (typeof this.resend.from !== 'string' || !this.resend.from.trim()) {
        missing.push('RESEND_FROM');
      }
      return { configured: missing.length === 0, missing, provider: this.provider };
    }

    const missing = [];
    if (!this.smtp.host) missing.push('SMTP_HOST');
    if (!this.smtp.port) missing.push('SMTP_PORT');
    if (!this.smtp.from) missing.push('SMTP_FROM');
    const hasPartialAuth = Boolean(this.smtp.user) !== Boolean(this.smtp.password);
    if (hasPartialAuth) missing.push('SMTP_USER/SMTP_PASSWORD');
    return { configured: missing.length === 0, missing, provider: this.provider };
  }

  isConfigured() {
    return this.configurationStatus().configured;
  }

  async verifyConfiguration() {
    if (!this.isConfigured()) return false;
    if (this.provider !== 'smtp') return true;

    await this.transporter.verify();
    return true;
  }

  async send({ recipient, subject, text, html }) {
    if (!this.isConfigured()) {
      const error = new Error('No hay un proveedor de correo configurado correctamente');
      error.status = 503;
      throw error;
    }
    if (typeof recipient !== 'string' || !recipient.trim()) {
      const error = new Error('El destinatario es obligatorio');
      error.status = 400;
      throw error;
    }

    if (this.provider === 'brevo') {
      return this.sendWithBrevo({ recipient, subject, text, html });
    }
    if (this.provider === 'resend') {
      return this.sendWithResend({ recipient, subject, text, html });
    }

    const result = await this.transporter.sendMail({
      from: this.smtp.from,
      to: recipient.trim(),
      subject,
      text,
      html
    });
    return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
  }

  async sendWithBrevo({ recipient, subject, text, html }) {
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('Este runtime no tiene soporte para fetch HTTPS');
    }

    const normalizedRecipient = recipient.trim();
    const response = await this.fetchImpl('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.brevo.apiKey.trim(),
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: this.brevo.fromName || 'HidroSmart',
          email: this.brevo.fromEmail.trim()
        },
        to: [{ email: normalizedRecipient }],
        subject,
        textContent: text,
        htmlContent: html
      }),
      signal: AbortSignal.timeout(15000)
    });

    const responseBody = await response.text();
    let result = {};

    try {
      result = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      // Se informa el estado HTTP sin exponer el cuerpo de respuesta sin validar.
    }

    if (!response.ok) {
      const error = new Error(
        `Brevo rechazó el envío (HTTP ${response.status}): ${result.message || 'Error de envío'}`
      );
      error.status = 502;
      throw error;
    }

    this.logger.info?.(`[BREVO] Solicitud aceptada (messageId=${result.messageId || 'sin id'})`);

    return {
      messageId: result.messageId,
      accepted: [normalizedRecipient],
      rejected: []
    };
  }

  async sendWithResend({ recipient, subject, text, html }) {
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('Este runtime no tiene soporte para fetch HTTPS');
    }

    const normalizedRecipient = recipient.trim();
    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resend.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.resend.from,
        to: [normalizedRecipient],
        subject,
        text,
        html
      }),
      signal: AbortSignal.timeout(15000)
    });

    const responseBody = await response.text();
    let result = {};

    try {
      result = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      // Se informa el estado HTTP sin exponer el cuerpo de respuesta sin validar.
    }

    if (!response.ok) {
      const error = new Error(
        `Resend rechazó el envío (HTTP ${response.status}): ${
          result.message || result.name || 'Error de envío'
        }`
      );
      error.status = 502;
      throw error;
    }

    return {
      messageId: result.id,
      accepted: [normalizedRecipient],
      rejected: []
    };
  }
}

module.exports = { SmtpEmailSender };
