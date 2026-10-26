const test = require('node:test');
const assert = require('node:assert/strict');
const { SmtpEmailSender } = require('../../src/core/infrastructure/notifications/SmtpEmailSender');

const smtp = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: 'HidroSmart <no-reply@example.com>'
};

test('envia por Resend HTTPS sin crear ni verificar transporte SMTP', async () => {
  let smtpFactoryCalls = 0;
  let request;
  const sender = new SmtpEmailSender({
    smtp,
    resend: {
      apiKey: 're_test_secret',
      from: 'HidroSmart <onboarding@resend.dev>'
    },
    transportFactory: () => {
      smtpFactoryCalls += 1;
      throw new Error('No debe inicializar SMTP si Resend esta configurado');
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'resend-email-123' })
      };
    }
  });

  assert.equal(sender.isConfigured(), true);
  assert.equal(await sender.verifyConfiguration(), true);
  assert.equal(smtpFactoryCalls, 0);

  const result = await sender.send({
    recipient: ' person@example.com ',
    subject: 'Verifica tu correo',
    text: 'Texto del correo',
    html: '<p>Texto del correo</p>'
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_secret');
  assert.deepEqual(JSON.parse(request.options.body), {
    from: 'HidroSmart <onboarding@resend.dev>',
    to: ['person@example.com'],
    subject: 'Verifica tu correo',
    text: 'Texto del correo',
    html: '<p>Texto del correo</p>'
  });
  assert.equal(result.messageId, 'resend-email-123');
  assert.deepEqual(result.accepted, ['person@example.com']);
  assert.deepEqual(result.rejected, []);
});

test('traduce el rechazo de Resend a un error de proveedor sin filtrar la clave', async () => {
  const sender = new SmtpEmailSender({
    smtp,
    resend: { apiKey: 're_test_secret', from: 'HidroSmart <onboarding@resend.dev>' },
    transportFactory: () => { throw new Error('SMTP no debe usarse'); },
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: 'Dominio no verificado' })
    })
  });

  await assert.rejects(
    () => sender.send({ recipient: 'person@example.com', subject: 'Prueba', text: 'Hola' }),
    (error) => {
      assert.equal(error.status, 502);
      assert.match(error.message, /HTTP 403/);
      assert.match(error.message, /Dominio no verificado/);
      assert.doesNotMatch(error.message, /re_test_secret/);
      return true;
    }
  );
});

test('rechaza Resend incompleto en vez de caer a SMTP silenciosamente', async () => {
  let smtpFactoryCalls = 0;
  const sender = new SmtpEmailSender({
    smtp,
    resend: { apiKey: 're_test_secret', from: '' },
    transportFactory: () => {
      smtpFactoryCalls += 1;
      return { sendMail: async () => ({ messageId: 'smtp-id' }) };
    }
  });

  assert.equal(sender.isConfigured(), false);
  await assert.rejects(
    () => sender.send({ recipient: 'person@example.com', subject: 'Prueba', text: 'Hola' }),
    (error) => error.status === 503
  );
  assert.equal(smtpFactoryCalls, 0);
});
