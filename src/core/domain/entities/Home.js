class Home {
  constructor({ id = null, name, address, city, usageType = 'RESIDENTIAL', tier = null, altitudeMeters = null, peopleCount = 3, status = 'Active', createdAt = null, homeRole = null }) {
    this.id = id;
    this.name = Home.validateText(name, 'name', 3, 100);
    this.address = Home.validateText(address, 'address', 1, 255);
    this.city = Home.validateText(city, 'city', 1, 100);
    this.usageType = Home.validateUsageType(usageType);
    this.tier = Home.validateTier(tier, this.usageType);
    this.altitudeMeters = Home.validateAltitude(altitudeMeters);
    this.peopleCount = Home.validatePeopleCount(peopleCount);
    this.status = status;
    this.createdAt = createdAt;
    this.homeRole = homeRole;
  }

  static create(attributes) {
    return new Home(attributes);
  }

  static validateText(value, field, min, max) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
      throw new Error(`${field} debe tener entre ${min} y ${max} caracteres`);
    }
    return value.trim();
  }

  static validateUsageType(usageType) {
    const normalized = String(usageType || 'RESIDENTIAL').trim().toUpperCase();
    if (!['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'].includes(normalized)) {
      throw new Error('usageType debe ser RESIDENTIAL, COMMERCIAL o INDUSTRIAL');
    }
    return normalized;
  }

  static validateTier(tier, usageType = 'RESIDENTIAL') {
    if (tier === null || tier === undefined || tier === '') return null;
    const numericTier = Number(tier);
    if (!Number.isInteger(numericTier) || numericTier < 1 || numericTier > 6) {
      throw new Error('tier debe ser un número entero entre 1 y 6');
    }
    if (usageType !== 'RESIDENTIAL') {
      throw new Error('Los usos comercial e industrial no tienen estrato');
    }
    return numericTier;
  }

  static validateAltitude(altitudeMeters) {
    if (altitudeMeters === null || altitudeMeters === undefined || altitudeMeters === '') return null;
    const numericAltitude = Number(altitudeMeters);
    if (!Number.isInteger(numericAltitude) || numericAltitude < 0 || numericAltitude > 10000) {
      throw new Error('altitudeMeters debe ser un entero entre 0 y 10000');
    }
    return numericAltitude;
  }

  static validatePeopleCount(peopleCount) {
    const numericPeopleCount = Number(peopleCount);
    if (!Number.isInteger(numericPeopleCount) || numericPeopleCount < 1 || numericPeopleCount > 50) {
      throw new Error('peopleCount debe ser un nÃºmero entero entre 1 y 50');
    }
    return numericPeopleCount;
  }
}

module.exports = { Home };
