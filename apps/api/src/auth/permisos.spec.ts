import { RolUsuario } from '../database/enums';
import { tienePermiso } from './jwt.guard';

const { CLIENTE, MAESTRO, ADMIN, SUPERADMIN } = RolUsuario;

describe('tienePermiso', () => {
  it('el superadmin entra a todo', () => {
    expect(tienePermiso(SUPERADMIN, [MAESTRO])).toBe(true);
    expect(tienePermiso(SUPERADMIN, [SUPERADMIN])).toBe(true);
  });

  it('el admin entra a todo excepto lo exclusivo del superadmin', () => {
    expect(tienePermiso(ADMIN, [MAESTRO])).toBe(true);
    expect(tienePermiso(ADMIN, [SUPERADMIN])).toBe(false);
  });

  it('los demás roles solo entran a lo suyo', () => {
    expect(tienePermiso(MAESTRO, [MAESTRO])).toBe(true);
    expect(tienePermiso(CLIENTE, [MAESTRO])).toBe(false);
    expect(tienePermiso(MAESTRO, [SUPERADMIN])).toBe(false);
  });
});
