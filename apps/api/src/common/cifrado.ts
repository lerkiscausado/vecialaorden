import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifrado simétrico AES-256-GCM para guardar secretos (claves de API) en la base.
 * La llave maestra es CONFIG_ENCRYPTION_KEY: 64 caracteres hexadecimales (32 bytes).
 * Formato guardado: v1.<iv>.<tag>.<datos>, cada parte en base64.
 */
const VERSION = 'v1';

export function llaveDesdeHex(hex: string | undefined): Buffer {
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('CONFIG_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

export function cifrar(texto: string, llave: Buffer): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', llave, iv);
  const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  const tag = cifrador.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), datos.toString('base64')].join('.');
}

export function descifrar(guardado: string, llave: Buffer): string {
  const [version, iv, tag, datos] = guardado.split('.');
  if (version !== VERSION || !iv || !tag || datos === undefined) {
    throw new Error('El secreto guardado tiene un formato desconocido.');
  }
  const descifrador = createDecipheriv('aes-256-gcm', llave, Buffer.from(iv, 'base64'));
  descifrador.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([descifrador.update(Buffer.from(datos, 'base64')), descifrador.final()]).toString('utf8');
}
