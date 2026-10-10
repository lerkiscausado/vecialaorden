import { normalizar } from '../common/texto';

/** Interpretación de respuestas cortas del cliente. */
const SI = /^(si+|claro|correcto|confirmo|confirmar|ok|okey|okay|dale|listo|de una|perfecto|exacto|eso es|hagale|enviar|envialo|asi esta bien|esta bien)\b/;
const CANCELAR = /^(cancelar|cancela|cancelalo|no quiero|olvidalo|olvidelo)\b/;
const NUEVO = /^(nuevo|nueva|otro servicio|otra solicitud|otro pedido|nuevo pedido)\b/;
const SALUDO = /^(hola+|buenas|buenos dias|buenas tardes|buenas noches|hey|ola|holi|saludos|que mas|q mas)( veci)?[\s!.,¡]*$/;
const SIN_UBICACION = /^(no|no tengo|no puedo|no se|nop|no gracias|despues)\b/;

const limpiar = (t: string) => normalizar(t).replace(/[¡!¿?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();

export const esSi = (t: string) => SI.test(limpiar(t));
export const esCancelar = (t: string) => CANCELAR.test(limpiar(t));
export const esNuevo = (t: string) => NUEVO.test(limpiar(t));
export const esSaludo = (t: string) => SALUDO.test(limpiar(t));
export const esSinUbicacion = (t: string) => SIN_UBICACION.test(limpiar(t));

/** Mensajes del bot. Formato de WhatsApp: *negrita*, _cursiva_. */
export const MSG = {
  bienvenida: (urlPrivacidad: string) =>
    `¡A la orden, veci! 👋 Soy el asistente de *Veci a la Orden*.\n\n` +
    `Cuéntame qué necesitas arreglar, las medidas si las tienes y en qué barrio estás, y te consigo cotizaciones de maestros cercanos.\n\n` +
    `_Al escribirnos aceptas nuestra política de tratamiento de datos: ${urlPrivacidad}_`,
  pedirDescripcion: 'Cuéntame qué necesitas arreglar: qué trabajo es, las medidas si las tienes y en qué barrio estás.',
  noEsSolicitud:
    'Por ahora te ayudo con arreglos y obras de la casa: pintura y estuco, drywall, plomería, electricidad, carpintería, enchape u obra general. ¿Qué necesitas arreglar?',
  pedirCiudad: (activas: string) => `¿En qué ciudad es el trabajo? Por ahora estamos en ${activas}.`,
  ciudadNoDisponible: (ciudad: string, activas: string) =>
    `Todavía no llegamos a ${ciudad} 😔, pero pronto. Por ahora atendemos en ${activas}. Si el trabajo es en una de ellas, escríbeme cuál.`,
  ciudadNoReconocida: (activas: string) =>
    `No reconocí la ciudad. Por ahora atendemos en ${activas}. ¿En cuál de ellas es el trabajo?`,
  pedirUbicacion:
    '¿Me compartes la ubicación del trabajo? 📍 Toca el clip › *Ubicación* › *Enviar tu ubicación actual*. Si prefieres, escríbeme el barrio.',
  barrioNoEncontrado: (ciudad: string) =>
    `No encontré ese barrio en ${ciudad}. Para avisarles a los maestros más cercanos, compárteme la ubicación 📍 (clip › *Ubicación*). Si no puedes, escríbeme *no* y uso una ubicación aproximada.`,
  publicada: (codigo: string, n: number) =>
    `¡Listo, veci! ✅ Tu pedido *#${codigo}* quedó publicado y les avisamos a *${n} ${n === 1 ? 'maestro' : 'maestros'}* cerca de ti.\n\n` +
    `Los 5 primeros te enviarán su cotización y te las mando apenas lleguen.`,
  publicadaSinMaestros: (codigo: string, areas: string) =>
    `Tu pedido *#${codigo}* quedó publicado ✅.\n\nPor ahora no hay maestros de ${areas} disponibles cerca de ti. Te aviso apenas uno pueda tomarlo.`,
  yaPublicada: (codigo: string) =>
    `Tu pedido *#${codigo}* está activo y te aviso cuando lleguen cotizaciones.\n\n` +
    `Si necesitas otro servicio escribe *NUEVO*, o *CANCELAR* para cancelar este pedido.`,
  cancelada: 'Listo, cancelé tu pedido. Cuando necesites algo, aquí estoy. ¡A la orden, veci!',
  nadaQueCancelar: 'No tienes ningún pedido en curso. Cuéntame qué necesitas arreglar cuando quieras.',
  noSePuedeCancelar: (codigo: string) =>
    `Tu pedido *#${codigo}* ya tiene maestro asignado o terminó, así que no lo puedo cancelar por aquí. Escríbenos si necesitas ayuda.`,
  errorIa: 'Uy, tuve un problema para entender tu mensaje 🙈. ¿Me lo escribes de nuevo con otras palabras?',
  sinTexto: 'Por ahora solo entiendo mensajes de texto y ubicaciones 📍. ¿Me escribes qué necesitas?',
};

export function resumenPedido(datos: {
  areas: string[];
  resumen: string | null;
  barrio: string | null;
  ciudad: string;
  ubicacionExacta: boolean;
  medidas: Record<string, number> | null;
  urgente: boolean;
}): string {
  const lineas = [`🔧 *${datos.areas.join(' + ')}*`];
  if (datos.resumen) lineas.push(`📝 ${datos.resumen}`);
  const lugar = datos.barrio ?? (datos.ubicacionExacta ? 'Ubicación compartida' : 'Ubicación aproximada');
  lineas.push(`📍 ${lugar}, ${datos.ciudad}`);
  const m = datos.medidas;
  if (m?.ancho && m?.largo) lineas.push(`📐 ${m.ancho} × ${m.largo} m${m.alto ? ` (alto ${m.alto} m)` : ''}`);
  if (datos.urgente) lineas.push('⚡ Urgente');
  return (
    `Este es tu pedido:\n\n${lineas.join('\n')}\n\n` +
    `¿Está bien? Responde *SÍ* para enviarlo a los maestros, o escríbeme qué quieres corregir.`
  );
}
