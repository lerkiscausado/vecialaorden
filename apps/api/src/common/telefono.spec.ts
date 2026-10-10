import { enmascararCelular, normalizarCelular } from './telefono';

describe('normalizarCelular', () => {
  it.each([
    ['3001234567', '+573001234567'],
    ['300 123 4567', '+573001234567'],
    ['300-123-4567', '+573001234567'],
    ['573001234567', '+573001234567'],
    ['+57 300 123 4567', '+573001234567'],
    ['+1 415 555 0100', '+14155550100'],
  ])('convierte %s en %s', (entrada, esperado) => {
    expect(normalizarCelular(entrada)).toBe(esperado);
  });

  it.each(['', '12345', '6011234567', '+57 601 234 5678', 'hola', '57300123456'])(
    'rechaza %s',
    (entrada) => {
      expect(normalizarCelular(entrada)).toBeNull();
    },
  );
});

describe('enmascararCelular', () => {
  it('oculta los dígitos del medio', () => {
    expect(enmascararCelular('+573001234567')).toBe('+57 300 ••• 4567');
  });
});
