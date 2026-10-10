import { esCancelar, esNuevo, esSaludo, esSi, esSinUbicacion, resumenPedido } from './textos';
import { areasCalculadas, validarAnalisis } from './analisis';
import { TamanoTrabajo } from '../database/enums';

describe('respuestas cortas', () => {
  it.each(['Sí', 'si', 'SIII', 'dale', 'De una!', 'listo', 'ok, envíalo', 'Correcto.', 'hágale'])('"%s" es sí', (t) =>
    expect(esSi(t)).toBe(true),
  );
  it.each(['no', 'sin', 'simple', 'cambia el barrio', 'mejor en Suba'])('"%s" no es sí', (t) =>
    expect(esSi(t)).toBe(false),
  );
  it('reconoce cancelar, nuevo, saludos y "no" a la ubicación', () => {
    expect(esCancelar('Cancelar')).toBe(true);
    expect(esCancelar('cancelado el piso')).toBe(false);
    expect(esNuevo('NUEVO')).toBe(true);
    expect(esSaludo('Hola!')).toBe(true);
    expect(esSaludo('Buenas tardes')).toBe(true);
    expect(esSaludo('hola necesito un plomero')).toBe(false);
    expect(esSinUbicacion('no tengo')).toBe(true);
    expect(esSinUbicacion('norte')).toBe(false);
  });
});

describe('validarAnalisis', () => {
  const slugs = ['estuco-pintura', 'drywall', 'plomeria'];

  it('limpia y conserva solo lo válido', () => {
    const r = validarAnalisis(
      {
        esSolicitud: true,
        areas: ['drywall', 'inventada', 'drywall', 'estuco-pintura'],
        resumen: '  Cielo raso en drywall  ',
        ciudad: 'Bogotá',
        barrio: null,
        medidas: { ancho: '3', largo: 4, alto: -1, otra: 9 },
        tamano: 'enorme',
        urgente: 'si',
      },
      slugs,
    );
    expect(r).toEqual({
      esSolicitud: true,
      areas: ['drywall', 'estuco-pintura'],
      resumen: 'Cielo raso en drywall',
      ciudad: 'Bogotá',
      barrio: null,
      medidas: { ancho: 3, largo: 4 },
      tamano: TamanoTrabajo.MEDIANO,
      urgente: false,
    });
  });

  it('sin áreas válidas no es solicitud', () => {
    expect(validarAnalisis({ esSolicitud: true, areas: ['jardineria'] }, slugs).esSolicitud).toBe(false);
    expect(validarAnalisis('basura', slugs).esSolicitud).toBe(false);
  });
});

describe('cálculos y resumen', () => {
  it('calcula áreas de piso y paredes', () => {
    expect(areasCalculadas({ ancho: 3, largo: 4 })).toEqual({ areaPiso: 12, areaParedes: 33.6 });
    expect(areasCalculadas(null)).toEqual({});
  });

  it('arma el resumen para confirmar', () => {
    const t = resumenPedido({
      areas: ['Estuco y pintura', 'Drywall'],
      resumen: 'Estuco en paredes y cielo raso',
      barrio: 'Cedritos',
      ciudad: 'Bogotá',
      ubicacionExacta: false,
      medidas: { ancho: 3, largo: 4 },
      urgente: true,
    });
    expect(t).toContain('*Estuco y pintura + Drywall*');
    expect(t).toContain('📍 Cedritos, Bogotá');
    expect(t).toContain('📐 3 × 4 m');
    expect(t).toContain('⚡ Urgente');
  });
});
