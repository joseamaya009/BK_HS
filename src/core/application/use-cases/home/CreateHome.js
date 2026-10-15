const { Home } = require('../../../domain/entities/Home');

class CreateHome {
  constructor({ homeRepository }) {
    this.homeRepository = homeRepository;
  }

  async execute({ userId, name, address, city, usageType, tier, altitudeMeters, peopleCount }) {
    if (!userId) throw new Error('El usuario autenticado es obligatorio');

    const home = Home.create({ name, address, city, usageType, tier, altitudeMeters, peopleCount });
    if (home.usageType === 'RESIDENTIAL' && home.tier === null) {
      throw this.badRequest('El estrato es obligatorio para un hogar residencial');
    }
    return this.homeRepository.createWithOwner(home, userId);
  }

  badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
  }
}

module.exports = { CreateHome };
