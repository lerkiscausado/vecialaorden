/**
 * Normaliza un celular al formato internacional E.164 (+573001234567).
 * Acepta formatos comunes en Colombia: "300 123 4567", "3001234567",
 * "573001234567", "+57 300-123-4567". Devuelve null si no es válido.
 */
export function normalizarCelular(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  const texto = entrada.trim();
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return null;

  // Celular colombiano sin indicativo: 10 dígitos que empiezan por 3.
  if (digitos.length === 10 && digitos.startsWith('3')) return `+57${digitos}`;

  // Colombiano con indicativo 57.
  if (digitos.length === 12 && digitos.startsWith('573')) return `+${digitos}`;

  // Otro país, solo si se escribió con "+" explícito (E.164: 8 a 15 dígitos).
  if (texto.startsWith('+') && digitos.length >= 8 && digitos.length <= 15 && !digitos.startsWith('57')) {
    return `+${digitos}`;
  }

  return null;
}

/** Oculta el celular para mostrarlo en mensajes: +57 300 ••• 4567 */
export function enmascararCelular(celular: string): string {
  const d = celular.replace(/\D/g, '');
  return `+${d.slice(0, d.length - 10)} ${d.slice(-10, -7)} ••• ${d.slice(-4)}`;
}
