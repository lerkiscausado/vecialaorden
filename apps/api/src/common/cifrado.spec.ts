import { randomBytes } from 'crypto';
import { cifrar, descifrar, llaveDesdeHex } from './cifrado';

describe('cifrado', () => {
  const llave = llaveDesdeHex(randomBytes(32).toString('hex'));

  it('descifra lo que cifró', () => {
    const secreto = 'sk-ant-ejemplo-1234567890';
    const guardado = cifrar(secreto, llave);
    expect(guardado).not.toContain(secreto);
    expect(guardado.startsWith('v1.')).toBe(true);
    expect(descifrar(guardado, llave)).toBe(secreto);
  });

  it('produce un resultado distinto cada vez (IV aleatorio)', () => {
    expect(cifrar('igual', llave)).not.toBe(cifrar('igual', llave));
  });

  it('falla con otra llave', () => {
    const otra = llaveDesdeHex(randomBytes(32).toString('hex'));
    expect(() => descifrar(cifrar('secreto', llave), otra)).toThrow();
  });

  it('falla si alguien altera el dato guardado', () => {
    const partes = cifrar('secreto', llave).split('.');
    partes[3] = Buffer.from('otro').toString('base64');
    expect(() => descifrar(partes.join('.'), llave)).toThrow();
  });

  it('exige una llave de 32 bytes en hexadecimal', () => {
    expect(() => llaveDesdeHex('corta')).toThrow();
    expect(() => llaveDesdeHex(undefined)).toThrow();
  });
});
