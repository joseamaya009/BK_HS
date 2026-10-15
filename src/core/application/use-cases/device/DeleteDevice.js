class DeleteDevice {
  constructor({ deviceRepository }) {
    this.deviceRepository = deviceRepository;
  }

  async execute({ userId, deviceId }) {
    if (!userId) this.badRequest('El usuario autenticado es obligatorio');
    if (!this.isUuid(deviceId)) this.badRequest('deviceId no es válido');

    const result = await this.deviceRepository.deleteUnlinked({ userId, deviceId });
    if (result === 'LINKED') {
      const error = new Error('Desvincula el dispositivo de todos los hogares antes de eliminarlo');
      error.status = 409;
      throw error;
    }
    if (result === 'NOT_FOUND') {
      const error = new Error('Dispositivo no encontrado');
      error.status = 404;
      throw error;
    }
    return result;
  }

  isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

module.exports = { DeleteDevice };
