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
    confianzaPromedio: number;
    totalResenas: number;
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
 * Sesión:
 * - El token de acceso (15 min) vive solo en memoria: no se guarda en el navegador.
 * - El token de renovación está en una cookie httpOnly que JavaScript no puede leer.
 * - En localStorage solo queda una marca "hay sesión" (sin secretos) para saber si
 *   vale la pena intentar renovar al abrir la página.
 */
const CLAVE_MARCA = 'veci_sesion';
let tokenAcceso: string | null = null;
let renovando: Promise<string | null> | null = null;

function guardarMarca(valor: boolean): void {
  try {
    if (valor) localStorage.setItem(CLAVE_MARCA, '1');
    else localStorage.removeItem(CLAVE_MARCA);
    localStorage.removeItem(CLAVE_TOKEN); // token de la versión anterior
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
}

/** ¿Hay (o hubo hace poco) una sesión abierta en este navegador? */
export function haySesion(): boolean {
  if (tokenAcceso) return true;
  try {
    return localStorage.getItem(CLAVE_MARCA) === '1';
  } catch {
    return false;
  }
}

/** Se llama después de ingresar: el API ya dejó la cookie de renovación. */
export function guardarSesion(token: string): void {
  tokenAcceso = token;
  guardarMarca(true);
}

/** Olvida la sesión en este navegador (sin avisar al API). */
export function borrarSesion(): void {
  tokenAcceso = null;
  guardarMarca(false);
}

/** Cierra la sesión en el API (revoca la cookie) y en el navegador. */
export async function cerrarSesion(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/salir`, { method: 'POST', credentials: 'include', headers: { 'X-Veci': '1' } });
  } catch {
    /* aunque falle la red, se borra localmente */
  }
  borrarSesion();
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pedirRenovacion(): Promise<string | null> {
  for (let intento = 0; intento < 3; intento++) {
    let r: Response;
    try {
      r = await fetch(`${API_URL}/auth/renovar`, { method: 'POST', credentials: 'include', headers: { 'X-Veci': '1' } });
    } catch {
      throw new ErrorApi('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.', 0);
    }
    const datos = await r.json().catch(() => null);
    if (r.ok && datos?.token) {
      guardarSesion(datos.token);
      return datos.token as string;
    }
    // Otra pestaña renovó al mismo tiempo: la cookie nueva ya está, se reintenta.
    if (r.status === 401 && datos?.codigo === 'reintentar') {
      await esperar(400 * (intento + 1));
      continue;
    }
    borrarSesion();
    return null;
  }
  borrarSesion();
  return null;
}

/** Pide un token de acceso nuevo. Una sola renovación a la vez, también entre pestañas. */
function renovar(): Promise<string | null> {
  if (!renovando) {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const peticion: Promise<string | null> = locks
      ? locks.request('veci-renovar', async () => await pedirRenovacion()).then((t) => t)
      : pedirRenovacion();
    renovando = peticion.finally(() => {
      renovando = null;
    });
  }
  return renovando;
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message);
  }
}

async function llamar(ruta: string, opciones: { metodo?: string; cuerpo?: unknown }): Promise<Response> {
  try {
    return await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? (opciones.cuerpo ? 'POST' : 'GET'),
      credentials: 'include',
      headers: {
        'X-Veci': '1',
        ...(opciones.cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(tokenAcceso ? { Authorization: `Bearer ${tokenAcceso}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.', 0);
  }
}

/**
 * Llama al API y devuelve el JSON. Lanza ErrorApi con un mensaje listo para mostrar.
 * Si el token de acceso venció, lo renueva una vez y reintenta.
 */
export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const deSesion = ruta.startsWith('/auth/') && ruta !== '/auth/yo' && ruta !== '/auth/salir-todo';
  if (!tokenAcceso && !deSesion && haySesion()) await renovar();

  let respuesta = await llamar(ruta, opciones);
  if (respuesta.status === 401 && !deSesion && haySesion()) {
    if (await renovar()) respuesta = await llamar(ruta, opciones);
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && !deSesion) borrarSesion();
    const mensaje = Array.isArray(datos?.message) ? datos.message[0] : datos?.message;
    throw new ErrorApi(mensaje ?? 'Algo salió mal. Intenta de nuevo.', respuesta.status);
  }
  return datos as T;
}
