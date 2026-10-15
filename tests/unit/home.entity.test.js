const test = require('node:test');
const assert = require('node:assert/strict');
const { Home } = require('../../src/core/domain/entities/Home');

test('crea un hogar válido y normaliza textos', () => {
  const home = Home.create({
    name: '  Casa Familiar  ',
    address: 'Carrera 1 # 2-3',
    city: 'Neiva',
    tier: '3'
  });

  assert.equal(home.name, 'Casa Familiar');
  assert.equal(home.city, 'Neiva');
  assert.equal(home.tier, 3);
  assert.equal(home.status, 'Active');
});

test('rechaza un estrato fuera del rango permitido', () => {
  assert.throws(
    () => Home.create({ name: 'Casa', address: 'Calle 1', city: 'Neiva', tier: 7 }),
    /tier debe ser un número entero entre 1 y 6/
  );
});

test('rechaza nombres demasiado cortos', () => {
  assert.throws(
    () => Home.create({ name: 'Hi', address: 'Calle 1', city: 'Neiva' }),
    /name debe tener entre 3 y 100 caracteres/
  );
});

test('permite uso comercial sin estrato', () => {
  const home = Home.create({
    name: 'Local comercial',
    address: 'Calle 1',
    city: 'Neiva',
    usageType: 'commercial'
  });

  assert.equal(home.usageType, 'COMMERCIAL');
  assert.equal(home.tier, null);
});

test('rechaza estrato para uso industrial', () => {
  assert.throws(
    () => Home.create({
      name: 'Planta industrial',
      address: 'Calle 1',
      city: 'Neiva',
      usageType: 'INDUSTRIAL',
      tier: 3
    }),
    /Los usos comercial e industrial no tienen estrato/
  );
});

test('valida la altitud opcional del hogar', () => {
  const home = Home.create({
    name: 'Casa de altura',
    address: 'Calle 1',
    city: 'Bogota',
    tier: 4,
    altitudeMeters: '2640'
  });

  assert.equal(home.altitudeMeters, 2640);
});

test('guarda la cantidad de personas del hogar para la referencia de consumo', () => {
  const home = Home.create({
    name: 'Casa de cuatro',
    address: 'Calle 1',
    city: 'Neiva',
    tier: 3,
    peopleCount: '4'
  });

  assert.equal(home.peopleCount, 4);
});

test('rechaza una cantidad de personas fuera del rango', () => {
  assert.throws(
    () => Home.create({ name: 'Casa', address: 'Calle 1', city: 'Neiva', tier: 3, peopleCount: 0 }),
    /peopleCount debe ser un nÃºmero entero entre 1 y 50/
  );
});
