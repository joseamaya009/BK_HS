class GetBudgetStatus {
  constructor({ consumptionRepository }) {
    this.consumptionRepository = consumptionRepository;
  }

  execute({ userId, homeId, asOfDate }) {
    if (!userId) throw this.badRequest('El usuario autenticado es obligatorio');
    if (!this.isUuid(homeId)) throw this.badRequest('homeId no es vÃ¡lido');

    const date = asOfDate || this.today();
    if (!this.isDate(date)) throw this.badRequest('asOfDate debe tener formato YYYY-MM-DD');
    if (date > this.today()) throw this.badRequest('asOfDate no puede ser una fecha futura');

    return this.consumptionRepository.getBudgetStatus({ userId, homeId, asOfDate: date });
  }

  isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  isDate(value) {
    return typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  }

  today() {
    return new Date().toISOString().slice(0, 10);
  }

  badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
  }
}

module.exports = { GetBudgetStatus };
