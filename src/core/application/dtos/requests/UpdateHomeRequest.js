class UpdateHomeRequest {
  constructor({ name, address, city, usageType = 'RESIDENTIAL', tier = null, altitudeMeters = null, peopleCount = 3 }) {
    this.name = name;
    this.address = address;
    this.city = city;
    this.usageType = usageType;
    this.tier = tier;
    this.altitudeMeters = altitudeMeters;
    this.peopleCount = peopleCount;
  }

  static fromRequest(body = {}) {
    return new UpdateHomeRequest({
      name: body.name,
      address: body.address,
      city: body.city,
      usageType: body.usageType,
      tier: body.tier,
      altitudeMeters: body.altitudeMeters,
      peopleCount: body.peopleCount
    });
  }
}

module.exports = { UpdateHomeRequest };
