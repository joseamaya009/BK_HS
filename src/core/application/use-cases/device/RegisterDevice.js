const { Device } = require('../../../domain/entities/Device');
const crypto = require('node:crypto');

class RegisterDevice {
  constructor({ deviceRepository }) {
    this.deviceRepository = deviceRepository;
  }

  async execute({ userId, homeId, code, name, type, hardwareId, location, manufacturer, model, alertThreshold }) {
    if (!userId) throw new Error('El usuario autenticado es obligatorio');
    if (!this.isUuid(homeId)) {
      const error = new Error('homeId no es válido');
      error.status = 400;
      throw error;
    }
    const normalizedHardwareId = Device.optionalHardwareId(hardwareId);
    const device = Device.create({
      code: this.resolveCode(code, normalizedHardwareId),
      name,
      type,
      hardwareId: normalizedHardwareId,
      location,
      manufacturer,
      model,
      alertThreshold
    });
    return this.deviceRepository.register(device, userId, homeId);
  }

  resolveCode(code, hardwareId = null) {
    if (typeof code === 'string' && code.trim()) return code.trim();
    if (hardwareId) return hardwareId;
    return `ESP32-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }

  isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}

module.exports = { RegisterDevice };
