class HomeResponse {
  static fromEntity(home) {
    return {
      homeId: home.id,
      name: home.name,
      address: home.address,
      city: home.city,
      usageType: home.usageType,
      tier: home.tier,
      altitudeMeters: home.altitudeMeters,
      peopleCount: home.peopleCount,
      status: home.status,
      homeRole: home.homeRole,
      createdAt: home.createdAt
    };
  }
}

module.exports = { HomeResponse };
