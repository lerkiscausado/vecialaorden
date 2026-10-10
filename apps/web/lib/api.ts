export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const CLAVE_TOKEN = 'veci_token';

export interface Usuario {
  id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  rol: 'cliente' | 'maestro' | 'admin' | 'superadmin';
  celularVerificado: boolean;
  barrio: string | null;
  ciudad: { id: number; nombre: string } | null;
  ubicacionAproximada: boolean;
  maestro: {
    aniosExperiencia: number;
    verificacion: string;
    saldoCreditos: number;
    calificacionPromedio: number;
    radioKm: number;
    recibeAvisos: boolean;
    areas: { slug: string; nombre: string }[];
  } | null;
}

export interface Ciudad {
  id: number;
  nombre: string;
  departamento: string;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface Area {
  slug: string;
  nombre: string;
}

export interface Movimiento {
  id: number;
  tipo: string;
  cantidad: number;
  saldoResultante: number;
  descripcion: string | null;
  creadoEn: string;
}

/*
 * PENDIENTE (seguridad): por ahora el token de acceso se guarda en localStorage.
 * Al pasar a access + refresh token, el refresh irá en una cookie httpOnly.
 */
export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    /* sin almacenamiento disponible: la sesión dura lo que la pestaña */
  }
}

export function borrarToken(): void {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* nada que hacer */
  }
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message);
  }
}

/** Llama al API y devuelve el JSON. Lanza ErrorApi con un mensaje listo para mostrar. */
export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const token = leerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? (opciones.cuerpo ? 'POST' : 'GET'),
      headers: {
        ...(opciones.cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.', 0);
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos?.message) ? datos.message[0] : datos?.message;
    throw new ErrorApi(mensaje ?? 'Algo salió mal. Intenta de nuevo.', respuesta.status);
  }
  return datos as T;
}
