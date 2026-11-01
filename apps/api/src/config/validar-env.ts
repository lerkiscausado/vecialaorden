/**
 * Valida las variables de entorno al arrancar, para fallar con un mensaje
 * claro en vez de un error raro más adelante.
 */
export function validarEnv(env: Record<string, unknown>): Record<string, unknown> {
  const faltantes = ['DB_USER', 'DB_NAME', 'JWT_SECRET', 'OTP_SECRET'].filter(
    (clave) => !env[clave] || String(env[clave]).trim() === '',
  );
  if (faltantes.length) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(', ')}. Copia apps/api/.env.example como apps/api/.env y llénalas.`,
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(String(env.CONFIG_ENCRYPTION_KEY ?? ''))) {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales. Genérala con: ' +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }

  const inseguras = ['JWT_SECRET', 'OTP_SECRET'].filter((clave) => {
    const valor = String(env[clave]);
    return valor.length < 32 || valor.startsWith('cambia_esto');
  });
  if (inseguras.length && env.NODE_ENV === 'production') {
    throw new Error(`${inseguras.join(', ')} deben ser valores aleatorios de al menos 32 caracteres.`);
  }

  // Wompi: o las tres llaves, o ninguna (compra en línea desactivada).
  const wompi = ['WOMPI_PUBLIC_KEY', 'WOMPI_INTEGRITY_SECRET', 'WOMPI_EVENTS_SECRET'];
  const conValor = wompi.filter((clave) => String(env[clave] ?? '').trim() !== '');
  if (conValor.length && conValor.length < wompi.length) {
    throw new Error(`Para Wompi faltan: ${wompi.filter((c) => !conValor.includes(c)).join(', ')}.`);
  }
  if (conValor.length && !/^pub_(test|prod)_/.test(String(env.WOMPI_PUBLIC_KEY).trim())) {
    throw new Error('WOMPI_PUBLIC_KEY debe empezar por pub_test_ o pub_prod_.');
  }

  return env;
}
