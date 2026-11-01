import { createHash, timingSafeEqual } from 'crypto';
import { EstadoPago } from '../database/enums';

/**
 * Funciones puras para hablar con Wompi (Colombia).
 * Checkout web: https://checkout.wompi.co/p/ con firma de integridad.
 * Eventos: transaction.updated con checksum SHA256.
 */

export const URL_CHECKOUT = 'https://checkout.wompi.co/p/';

export interface ConfigWompi {
  llavePublica: string;
  secretoIntegridad: string;
  secretoEventos: string;
}

/** Las llaves de prueba empiezan por pub_test_; las de producción por pub_prod_. */
export function esPrueba(llavePublica: string): boolean {
  return llavePublica.startsWith('pub_test_');
}

export function urlApi(llavePublica: string): string {
  return esPrueba(llavePublica) ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
}

const sha256 = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

/** SHA256(referencia + montoEnCentavos + moneda + secretoIntegridad). */
export function firmaIntegridad(referencia: string, montoEnCentavos: number, moneda: string, secreto: string): string {
  return sha256(`${referencia}${montoEnCentavos}${moneda}${secreto}`);
}

export function urlCheckout(
  cfg: ConfigWompi,
  datos: { referencia: string; montoEnCentavos: number; urlRegreso: string; correo?: string | null; nombre?: string; celular?: string },
): string {
  const p = new URLSearchParams({
    'public-key': cfg.llavePublica,
    currency: 'COP',
    'amount-in-cents': String(datos.montoEnCentavos),
    reference: datos.referencia,
    'signature:integrity': firmaIntegridad(datos.referencia, datos.montoEnCentavos, 'COP', cfg.secretoIntegridad),
    'redirect-url': datos.urlRegreso,
  });
  if (datos.correo) p.set('customer-data:email', datos.correo);
  if (datos.nombre) p.set('customer-data:full-name', datos.nombre);
  if (datos.celular) {
    p.set('customer-data:phone-number', datos.celular.replace(/^\+?57/, ''));
    p.set('customer-data:phone-number-prefix', '+57');
  }
  return `${URL_CHECKOUT}?${p}`;
}

/** Lee un valor anidado: "transaction.id" dentro de data. */
function leerRuta(objeto: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), objeto);
}

export interface EventoWompi {
  event?: string;
  data?: { transaction?: TransaccionWompi };
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
}

export interface TransaccionWompi {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency?: string;
  payment_method_type?: string;
}

/**
 * Valida el checksum de un evento: concatena los valores de signature.properties
 * (en ese orden, leídos de data), luego el timestamp y el secreto de eventos.
 */
export function eventoValido(evento: EventoWompi, secretoEventos: string, checksumCabecera?: string): boolean {
  const props = evento?.signature?.properties;
  const recibido = String(checksumCabecera || evento?.signature?.checksum || '').toLowerCase();
  if (!Array.isArray(props) || !props.length || evento.timestamp === undefined || !/^[0-9a-f]{64}$/.test(recibido)) {
    return false;
  }
  const valores = props.map((p) => {
    const v = leerRuta(evento.data, p);
    return v === undefined || v === null ? '' : String(v);
  });
  const calculado = sha256(`${valores.join('')}${evento.timestamp}${secretoEventos}`);
  return timingSafeEqual(Buffer.from(calculado), Buffer.from(recibido));
}

/** Estado de Wompi → estado propio. PENDING sigue pendiente. */
export function estadoDesdeWompi(status: string): EstadoPago {
  switch (status) {
    case 'APPROVED':
      return EstadoPago.APROBADO;
    case 'DECLINED':
      return EstadoPago.RECHAZADO;
    case 'VOIDED':
      return EstadoPago.ANULADO;
    case 'ERROR':
      return EstadoPago.ERROR;
    default:
      return EstadoPago.PENDIENTE;
  }
}
