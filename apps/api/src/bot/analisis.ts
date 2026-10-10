import { TamanoTrabajo } from '../database/enums';

/** Lo que la IA extrae del mensaje del cliente. */
export interface AnalisisPedido {
  esSolicitud: boolean;
  areas: string[];
  resumen: string | null;
  ciudad: string | null;
  barrio: string | null;
  medidas: Record<string, number> | null;
  tamano: TamanoTrabajo;
  urgente: boolean;
}

export interface AreaCatalogo {
  slug: string;
  nombre: string;
}

export function instruccionesAnalisis(areas: AreaCatalogo[]): string {
  const lista = areas.map((a) => `- ${a.slug}: ${a.nombre}`).join('\n');
  return `Eres el asistente de "Veci a la Orden", una plataforma de Colombia que conecta a personas que necesitan un arreglo u obra en su casa con maestros de oficios cercanos.

Analiza lo que escribe el cliente y extrae los datos del trabajo. Responde con un objeto JSON con exactamente estas claves:

{
  "esSolicitud": boolean,       // true si pide un arreglo, reparación, instalación u obra en un inmueble
  "areas": string[],            // de 1 a 3 identificadores de la lista de áreas, el más importante primero
  "resumen": string | null,     // máximo 200 caracteres, en tercera persona, para que el maestro entienda el trabajo; sin nombres ni teléfonos
  "ciudad": string | null,      // ciudad de Colombia donde es el trabajo, tal como la mencionó
  "barrio": string | null,      // barrio o sector, tal como lo mencionó
  "medidas": { "ancho": number, "largo": number, "alto": number } | null,  // en metros; incluye solo las que dio
  "tamano": "pequeno" | "mediano" | "grande",
  "urgente": boolean            // true si dice que es urgente, para hoy o que hay daño en curso (inundación, corto)
}

Áreas disponibles (usa solo estos identificadores):
${lista}

Criterios de tamaño:
- pequeno: reparación puntual que se resuelve en una visita (una fuga, un enchufe, una puerta).
- mediano: un espacio completo (un cuarto, un baño, una cocina pequeña).
- grande: varios espacios, remodelación o trabajos de varios días.

No inventes datos: si algo no aparece en el mensaje, usa null (o false). Si el mensaje no es un pedido de este tipo de trabajos, responde esSolicitud: false y areas: [].`;
}

export function mensajeCorreccion(actual: AnalisisPedido, texto: string): string {
  return `Datos actuales del pedido:
${JSON.stringify(actual)}

El cliente escribió lo siguiente para corregir o completar su pedido:
"""${texto}"""

Devuelve el pedido completo y actualizado con el mismo formato JSON. Conserva los datos que no cambian.`;
}

const TAMANOS = new Set<string>(Object.values(TamanoTrabajo));

/** Limpia la respuesta de la IA: nunca se confía en que venga perfecta. */
export function validarAnalisis(crudo: unknown, slugsValidos: string[]): AnalisisPedido {
  const d = (crudo && typeof crudo === 'object' ? crudo : {}) as Record<string, unknown>;
  const texto = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

  const validos = new Set(slugsValidos);
  const areas = Array.isArray(d.areas)
    ? [...new Set(d.areas.filter((a): a is string => typeof a === 'string' && validos.has(a)))].slice(0, 3)
    : [];

  let medidas: Record<string, number> | null = null;
  if (d.medidas && typeof d.medidas === 'object') {
    const m: Record<string, number> = {};
    for (const clave of ['ancho', 'largo', 'alto']) {
      const v = Number((d.medidas as Record<string, unknown>)[clave]);
      if (Number.isFinite(v) && v > 0 && v < 1000) m[clave] = Math.round(v * 100) / 100;
    }
    if (Object.keys(m).length) medidas = m;
  }

  const tamano = typeof d.tamano === 'string' && TAMANOS.has(d.tamano) ? (d.tamano as TamanoTrabajo) : TamanoTrabajo.MEDIANO;

  return {
    esSolicitud: d.esSolicitud === true && areas.length > 0,
    areas,
    resumen: texto(d.resumen, 300),
    ciudad: texto(d.ciudad, 80),
    barrio: texto(d.barrio, 160),
    medidas,
    tamano,
    urgente: d.urgente === true,
  };
}

/** Créditos que cuesta cotizar según el tamaño del trabajo. */
export const CREDITOS_POR_TAMANO: Record<TamanoTrabajo, number> = {
  [TamanoTrabajo.PEQUENO]: 1,
  [TamanoTrabajo.MEDIANO]: 3,
  [TamanoTrabajo.GRANDE]: 5,
};

/** Área del piso y de las paredes a partir de las medidas, cuando se puede. */
export function areasCalculadas(medidas: Record<string, number> | null): Record<string, number> {
  if (!medidas?.ancho || !medidas?.largo) return {};
  const piso = medidas.ancho * medidas.largo;
  const alto = medidas.alto ?? 2.4;
  const paredes = 2 * (medidas.ancho + medidas.largo) * alto;
  return { areaPiso: Math.round(piso * 10) / 10, areaParedes: Math.round(paredes * 10) / 10 };
}
