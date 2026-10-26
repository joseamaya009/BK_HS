const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesTicketStatus } = require('../../src/api/controllers/TicketController');

test('el filtro Finalizado agrupa tickets Resueltos y Cerrados', () => {
  assert.equal(matchesTicketStatus('Resuelto', 'Finalizado'), true);
  assert.equal(matchesTicketStatus('Cerrado', 'Finalizado'), true);
  assert.equal(matchesTicketStatus('Abierto', 'Finalizado'), false);
});

test('los filtros Abierto y En Proceso conservan su estado exacto', () => {
  assert.equal(matchesTicketStatus('Abierto', 'Abierto'), true);
  assert.equal(matchesTicketStatus('En Proceso', 'En Proceso'), true);
  assert.equal(matchesTicketStatus('Cerrado', 'En Proceso'), false);
});

test('sin filtro de estado se incluyen todos los tickets', () => {
  assert.equal(matchesTicketStatus('Cerrado', null), true);
});
