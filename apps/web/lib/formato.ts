const numero = new Intl.NumberFormat('es-CO');
const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const pesos = (n: number) => `$${numero.format(n)}`;
export const num = (n: number) => numero.format(n);
export const fecha = (d: string | Date | null) => (d ? fechaHora.format(new Date(d)) : '—');
export const dia = (d: string) => fechaCorta.format(new Date(`${d}T12:00:00`));

/** "hace 5 min", "hace 3 h", "hace 2 días" */
export function hace(d: string | Date | null): string {
  if (!d) return '';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function minutos(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
  return `${Math.round(h / 24)} días`;
}

export const ESTADO_PEDIDO: Record<string, string> = {
  borrador: 'Borrador',
  abierta: 'Recibiendo cotizaciones',
  cupos_llenos: 'Cotizaciones completas',
  asignada: 'Maestro elegido',
  completada: 'Terminado',
  cancelada: 'Cancelado',
  vencida: 'Vencido',
};

export const ESTADO_COTIZACION: Record<string, string> = {
  enviada: 'En espera',
  elegida: 'Elegida',
  descartada: 'No elegida',
  retirada: 'Retirada',
};
