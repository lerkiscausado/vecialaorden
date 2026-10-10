/**
 * Orden recomendado de las cotizaciones para el cliente.
 * Puntaje de 0 a 100 = 30% calificación y confianza + 25% precio justo
 * + 20% rapidez + 15% cercanía + 10% experiencia.
 * Dentro del 30%, la confianza pesa la mitad.
 */
export interface DatosRanking {
  cotizacionId: number;
  precioTotal: number;
  minutosRespuesta: number;
  distanciaKm: number | null;
  calificacion: number;
  /** Promedio del aspecto confianza (1 a 5). */
  confianza: number;
  totalResenas: number;
  trabajosCompletados: number;
  aniosExperiencia: number;
}

/** Cómo se ve el precio frente a la referencia. */
export type EtiquetaPrecio = 'justo' | 'muy_bajo' | 'alto' | 'sin_referencia';

export interface Rankeada extends DatosRanking {
  puntaje: number;
  etiquetaPrecio: EtiquetaPrecio;
  confianzaBaja: boolean;
}

/** Con al menos esta cantidad de reseñas, una confianza menor a 3 se marca como alerta. */
export const MINIMO_RESENAS_ALERTA = 3;
export const UMBRAL_CONFIANZA_BAJA = 3;

export function confianzaBaja(confianza: number, totalResenas: number): boolean {
  return totalResenas >= MINIMO_RESENAS_ALERTA && confianza > 0 && confianza < UMBRAL_CONFIANZA_BAJA;
}

export const PESOS = { calificacion: 0.3, precio: 0.25, rapidez: 0.2, cercania: 0.15, experiencia: 0.1 };

/** Con menos cotizaciones que esto y sin precio de referencia del oficio, no se califica el precio. */
const MINIMO_PARA_COMPARAR = 3;

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function etiquetarPrecio(
  precio: number,
  referencia: { min: number; max: number } | null,
  todos: number[],
): EtiquetaPrecio {
  if (referencia) {
    if (precio < referencia.min * 0.85) return 'muy_bajo';
    if (precio > referencia.max * 1.1) return 'alto';
    return 'justo';
  }
  if (todos.length < MINIMO_PARA_COMPARAR) return 'sin_referencia';
  const med = mediana(todos);
  if (precio < med * 0.7) return 'muy_bajo';
  if (precio > med * 1.3) return 'alto';
  return 'justo';
}

export function rankear(items: DatosRanking[], referencia: { min: number; max: number } | null = null): Rankeada[] {
  if (!items.length) return [];
  const precios = items.map((i) => i.precioTotal);
  const centro = referencia ? (referencia.min + referencia.max) / 2 : mediana(precios);
  const minT = Math.min(...items.map((i) => i.minutosRespuesta));
  const maxT = Math.max(...items.map((i) => i.minutosRespuesta));
  const distancias = items.map((i) => i.distanciaKm).filter((d): d is number => d !== null);
  const maxD = distancias.length ? Math.max(...distancias) : 0;

  return items
    .map((i) => {
      // Sin reseñas todavía: valor neutro, para no castigar a los maestros nuevos.
      const escala = (v: number) => Math.min(1, Math.max(0, (v - 1) / 4));
      const sCalificacion =
        i.totalResenas > 0 ? 0.5 * escala(i.calificacion) + 0.5 * escala(i.confianza || i.calificacion) : 0.6;
      const sPrecio = centro > 0 ? Math.max(0, 1 - (Math.abs(i.precioTotal - centro) / centro) * 1.6) : 0.5;
      const sRapidez = maxT === minT ? 1 : 1 - (i.minutosRespuesta - minT) / (maxT - minT);
      const sCercania = i.distanciaKm === null ? 0.5 : 1 - i.distanciaKm / (maxD + 1);
      const sExperiencia = Math.min(1, (i.trabajosCompletados / 50) * 0.6 + (i.aniosExperiencia / 20) * 0.4);
      const puntaje = Math.round(
        100 *
          (PESOS.calificacion * sCalificacion +
            PESOS.precio * sPrecio +
            PESOS.rapidez * sRapidez +
            PESOS.cercania * sCercania +
            PESOS.experiencia * sExperiencia),
      );
      return {
        ...i,
        puntaje,
        etiquetaPrecio: etiquetarPrecio(i.precioTotal, referencia, precios),
        confianzaBaja: confianzaBaja(i.confianza, i.totalResenas),
      };
    })
    .sort((a, b) => b.puntaje - a.puntaje || a.precioTotal - b.precioTotal);
}
