import { DatosRanking, etiquetarPrecio, rankear } from './ranking';

const base: Omit<DatosRanking, 'cotizacionId'> = {
  precioTotal: 1_000_000,
  minutosRespuesta: 10,
  distanciaKm: 2,
  calificacion: 0,
  totalResenas: 0,
  trabajosCompletados: 0,
  aniosExperiencia: 5,
};

describe('rankear', () => {
  it('deja primero a la mejor combinación', () => {
    const r = rankear([
      { ...base, cotizacionId: 1, precioTotal: 1_500_000, minutosRespuesta: 90, distanciaKm: 9 },
      { ...base, cotizacionId: 2, calificacion: 4.9, totalResenas: 30, trabajosCompletados: 60, aniosExperiencia: 15 },
      { ...base, cotizacionId: 3, precioTotal: 980_000, minutosRespuesta: 15 },
    ]);
    expect(r.map((x) => x.cotizacionId)).toEqual([2, 3, 1]);
    expect(r[0].puntaje).toBeGreaterThan(r[1].puntaje);
    r.forEach((x) => {
      expect(x.puntaje).toBeGreaterThanOrEqual(0);
      expect(x.puntaje).toBeLessThanOrEqual(100);
    });
  });

  it('no castiga a un maestro nuevo frente a uno mal calificado', () => {
    const r = rankear([
      { ...base, cotizacionId: 1, calificacion: 2, totalResenas: 10 },
      { ...base, cotizacionId: 2 },
    ]);
    expect(r[0].cotizacionId).toBe(2);
  });

  it('con una sola cotización no inventa si el precio es justo', () => {
    const [unica] = rankear([{ ...base, cotizacionId: 1 }]);
    expect(unica.etiquetaPrecio).toBe('sin_referencia');
  });

  it('lista vacía', () => {
    expect(rankear([])).toEqual([]);
  });
});

describe('etiquetarPrecio', () => {
  it('compara con la referencia del oficio cuando existe', () => {
    const ref = { min: 800_000, max: 1_200_000 };
    expect(etiquetarPrecio(600_000, ref, [])).toBe('muy_bajo');
    expect(etiquetarPrecio(1_000_000, ref, [])).toBe('justo');
    expect(etiquetarPrecio(1_400_000, ref, [])).toBe('alto');
  });

  it('sin referencia compara contra la mediana de las cotizaciones', () => {
    const todos = [1_000_000, 1_050_000, 950_000, 500_000, 2_000_000];
    expect(etiquetarPrecio(500_000, null, todos)).toBe('muy_bajo');
    expect(etiquetarPrecio(1_000_000, null, todos)).toBe('justo');
    expect(etiquetarPrecio(2_000_000, null, todos)).toBe('alto');
  });
});
