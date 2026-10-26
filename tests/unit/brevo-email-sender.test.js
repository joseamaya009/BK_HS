const test = require('node:test');
const assert = require('node:assert/strict');
const { SmtpEmailSender } = require('../../src/core/infrastructure/notifications/SmtpEmailSender');

const smtp = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: 'HidroSmart <no-reply@example.com>'
};

test('envía por Brevo y lo prioriza sobre Resend y SMTP', async () => {
  let smtpFactoryCalls = 0;
  let request;
  const sender = new SmtpEmailSender({
    smtp,
    brevo: {
      apiKey: 'xkeysib-test-secret',
      fromEmail: 'notificaciones@example.com',
      fromName: 'HidroSmart QA'
    },
    resend: { apiKey: 're_test_secret', from: 'HidroSmart <no-reply@example.com>' },
    transportFactory: () => {
      smtpFactoryCalls += 1;
      throw new Error('SMTP no debe inicializarse con Brevo configurado');
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ messageId: '<brevo-message-123>' })
      };
    }
  });

  assert.equal(sender.provider, 'brevo');
  assert.equal(sender.isConfigured(), true);
  assert.equal(await sender.verifyConfiguration(), true);
  assert.equal(smtpFactoryCalls, 0);

  const result = await sender.send({
    recipient: ' person@example.com ',
    subject: 'Verifica tu correo',
    text: 'Texto del correo',
    html: '<p>Texto del correo</p>'
  });

  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['api-key'], 'xkeysib-test-secret');
  assert.deepEqual(JSON.parse(request.options.body), {
    sender: { name: 'HidroSmart QA', email: 'notificaciones@example.com' },
    to: [{ email: 'person@example.com' }],
    subject: 'Verifica tu correo',
    textContent: 'Texto del correo',
    htmlContent: '<p>Texto del correo</p>'
  });
  assert.equal(result.messageId, '<brevo-message-123>');
  assert.deepEqual(result.accepted, ['person@example.com']);
  assert.deepEqual(result.rejected, []);
});

test('no cae silenciosamente a Resend o SMTP si Brevo está incompleto', async () => {
  let smtpFactoryCalls = 0;
  const sender = new SmtpEmailSender({
    smtp,
    brevo: { apiKey: 'xkeysib-test-secret', fromEmail: '' },
    resend: { apiKey: 're_test_secret', from: 'HidroSmart <no-reply@example.com>' },
    transportFactory: () => {
      smtpFactoryCalls += 1;
      return { sendMail: async () => ({ messageId: 'smtp-id' }) };
    }
  });

  assert.equal(sender.provider, 'brevo');
  assert.equal(sender.isConfigured(), false);
  await assert.rejects(
    () => sender.send({ recipient: 'person@example.com', subject: 'Prueba', text: 'Hola' }),
    (error) => error.status === 503
  );
  assert.equal(smtpFactoryCalls, 0);
});

test('traduce errores HTTP de Brevo sin mostrar la clave API', async () => {
  const sender = new SmtpEmailSender({
    smtp,
    brevo: {
      apiKey: 'xkeysib-test-secret',
      fromEmail: 'notificaciones@example.com'
    },
    transportFactory: () => { throw new Error('SMTP no debe usarse'); },
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'API key inválida' })
    })
  });

  await assert.rejects(
    () => sender.send({ recipient: 'person@example.com', subject: 'Prueba', text: 'Hola' }),
    (error) => {
      assert.equal(error.status, 502);
      assert.match(error.message, /HTTP 401/);
      assert.doesNotMatch(error.message, /xkeysib-test-secret/);
      return true;
    }
  );
});
