import { ProveedorIa } from '../../database/enums';

/** Datos necesarios para hablar con un modelo (la clave ya descifrada). */
export interface ConexionIa {
  proveedor: ProveedorIa;
  modelo: string;
  apiKey: string;
  baseUrl?: string | null;
  temperatura?: number | null;
  maxTokens: number;
}

export interface PeticionIa {
  /** Instrucciones de sistema (rol, reglas, formato). */
  sistema?: string;
  /** Mensaje del usuario. */
  mensaje: string;
  /** Pedir la respuesta en JSON. */
  json?: boolean;
}

export interface RespuestaIa {
  texto: string;
  tokensEntrada?: number;
  tokensSalida?: number;
}

export interface ModeloIa {
  id: string;
  nombre: string;
}

/** Cada proveedor implementa esta interfaz. */
export interface ClienteIa {
  completar(conexion: ConexionIa, peticion: PeticionIa): Promise<RespuestaIa>;
  listarModelos(conexion: Omit<ConexionIa, 'modelo' | 'maxTokens'>): Promise<ModeloIa[]>;
}

/** Error de un proveedor de IA, con un mensaje que se puede mostrar al superadmin. */
export class ErrorProveedorIa extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message);
    this.name = 'ErrorProveedorIa';
  }
}

export const INSTRUCCION_JSON = 'Responde únicamente con un objeto JSON válido, sin texto antes ni después.';

const TIEMPO_MAXIMO_MS = 60_000;

/** fetch con tiempo máximo y mensajes de error legibles. */
export async function pedirJson<T>(url: string, init: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { ...init, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
  } catch (error) {
    const motivo = (error as Error).name === 'TimeoutError' ? 'no respondió a tiempo' : 'no se pudo contactar';
    throw new ErrorProveedorIa(`El proveedor de IA ${motivo}.`);
  }

  const texto = await respuesta.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    /* respuesta no JSON */
  }

  if (!respuesta.ok) {
    const detalle = datos?.error?.message ?? datos?.message ?? texto.slice(0, 200);
    const pista =
      respuesta.status === 401 || respuesta.status === 403
        ? 'La clave de API no es válida o no tiene permisos.'
        : respuesta.status === 404
          ? 'El modelo o la dirección no existen.'
          : respuesta.status === 429
            ? 'Se superó el límite de uso o no hay saldo en la cuenta del proveedor.'
            : `El proveedor respondió con error ${respuesta.status}.`;
    throw new ErrorProveedorIa(detalle ? `${pista} Detalle: ${detalle}` : pista, respuesta.status);
  }
  return datos as T;
}

/** Une la URL base con una ruta, sin barras dobles. */
export function unirUrl(base: string, ruta: string): string {
  return `${base.replace(/\/+$/, '')}/${ruta.replace(/^\/+/, '')}`;
}
