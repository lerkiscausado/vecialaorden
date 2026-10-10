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

  const inseguras = ['JWT_SECRET', 'OTP_SECRET'].filter((clave) => {
    const valor = String(env[clave]);
    return valor.length < 32 || valor.startsWith('cambia_esto');
  });
  if (inseguras.length && env.NODE_ENV === 'production') {
    throw new Error(`${inseguras.join(', ')} deben ser valores aleatorios de al menos 32 caracteres.`);
  }

  return env;
}
