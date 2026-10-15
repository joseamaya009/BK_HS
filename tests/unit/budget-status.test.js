const test = require('node:test');
const assert = require('node:assert/strict');
const { GetBudgetStatus } = require('../../src/core/application/use-cases/consumption/GetBudgetStatus');

const validHomeId = '123e4567-e89b-12d3-a456-426614174000';

test('consulta el estado de presupuesto con la fecha actual por defecto', async () => {
  const calls = [];
  const useCase = new GetBudgetStatus({
    consumptionRepository: {
      getBudgetStatus: async (input) => { calls.push(input); return { budgetStatus: 'NORMAL' }; }
    }
  });

  const result = await useCase.execute({ userId: 'user-1', homeId: validHomeId });

  assert.equal(result.budgetStatus, 'NORMAL');
  assert.deepEqual(calls[0], {
    userId: 'user-1',
    homeId: validHomeId,
    asOfDate: new Date().toISOString().slice(0, 10)
  });
});

test('rechaza una fecha futura en el estado de presupuesto', async () => {
  const useCase = new GetBudgetStatus({ consumptionRepository: {} });

  await assert.rejects(
    async () => useCase.execute({ userId: 'user-1', homeId: validHomeId, asOfDate: '2999-01-01' }),
    (error) => error.status === 400 && /fecha futura/.test(error.message)
  );
});
