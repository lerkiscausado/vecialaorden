import { ProveedorIa } from '../../database/enums';
import { clienteAnthropic } from './anthropic';
import { clienteGemini } from './gemini';
import { clienteOpenAi } from './openai';
import { ClienteIa } from './tipos';

export * from './tipos';

const CLIENTES: Record<ProveedorIa, ClienteIa> = {
  [ProveedorIa.ANTHROPIC]: clienteAnthropic,
  [ProveedorIa.OPENAI]: clienteOpenAi,
  [ProveedorIa.OPENAI_COMPATIBLE]: clienteOpenAi,
  [ProveedorIa.GEMINI]: clienteGemini,
};

export function clientePara(proveedor: ProveedorIa): ClienteIa {
  return CLIENTES[proveedor];
}

export const NOMBRES_PROVEEDOR: Record<ProveedorIa, string> = {
  [ProveedorIa.ANTHROPIC]: 'Claude (Anthropic)',
  [ProveedorIa.OPENAI]: 'ChatGPT (OpenAI)',
  [ProveedorIa.GEMINI]: 'Gemini (Google)',
  [ProveedorIa.OPENAI_COMPATIBLE]: 'Compatible con OpenAI',
};

/** Extrae el JSON de una respuesta, aunque el modelo lo envuelva en ```json … ``` o agregue texto. */
export function extraerJson<T = unknown>(texto: string): T {
  const sinCercas = texto.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(sinCercas) as T;
  } catch {
    const inicio = sinCercas.indexOf('{');
    const fin = sinCercas.lastIndexOf('}');
    if (inicio >= 0 && fin > inicio) return JSON.parse(sinCercas.slice(inicio, fin + 1)) as T;
    throw new Error('La respuesta del modelo no contiene JSON válido.');
  }
}
