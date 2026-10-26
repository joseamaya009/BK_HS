const nodemailer = require('nodemailer');

class SmtpEmailSender {
  constructor({
    smtp = {},
    brevo = {},
    resend = {},
    transportFactory = nodemailer.createTransport,
    fetchImpl = globalThis.fetch
  }) {
    this.smtp = smtp;
    this.brevo = brevo;
    this.resend = resend;
    this.fetchImpl = fetchImpl;
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

  isConfigured() {
    if (this.provider === 'brevo') {
      return Boolean(this.brevo.apiKey && this.brevo.fromEmail);
    }
    if (this.provider === 'resend') return Boolean(this.resend.from);

    const hasPartialAuth = Boolean(this.smtp.user) !== Boolean(this.smtp.password);
    return Boolean(this.smtp.host && this.smtp.port && this.smtp.from && !hasPartialAuth);
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
        'api-key': this.brevo.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: this.brevo.fromName || 'HidroSmart',
          email: this.brevo.fromEmail
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
