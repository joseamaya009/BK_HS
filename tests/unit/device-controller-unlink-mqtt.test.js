const test = require('node:test');
const assert = require('node:assert/strict');
const { DeviceController } = require('../../src/api/controllers/DeviceController');

const deviceId = '123e4567-e89b-12d3-a456-426614174000';
const homeId = '223e4567-e89b-12d3-a456-426614174000';

test('publica unlink por MQTT después de desvincular el dispositivo', async () => {
  let publication;
  let responseStatus;
  let responseSent = false;
  const controller = new DeviceController({
    unlinkDeviceFromHome: {
      execute: async () => ({ deviceCode: 'HS-7A3F91C8D2E4' })
    },
    deviceCommandPublisher: {
      publish: async (...args) => {
        publication = args;
      }
    },
    deviceCommandsTopic: (code) => `hidrosmart/devices/${code}/commands`
  });
  const response = {
    status: (status) => {
      responseStatus = status;
      return {
        send: () => {
          responseSent = true;
        }
      };
    }
  };

  await controller.unlink(
    { user: { id: 'user-1' }, params: { deviceId, homeId } },
    response
  );

  assert.deepEqual(publication, [
    'hidrosmart/devices/HS-7A3F91C8D2E4/commands',
    { command: 'unlink', reason: 'device_unlinked' },
    { qos: 1, retain: false }
  ]);
  assert.equal(responseStatus, 204);
  assert.equal(responseSent, true);
});
