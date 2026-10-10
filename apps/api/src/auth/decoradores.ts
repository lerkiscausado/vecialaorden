import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../database/enums';

/** Datos del usuario que viajan dentro del JWT. */
export interface UsuarioJwt {
  id: number;
  rol: RolUsuario;
}

export const ES_PUBLICO = 'esPublico';
/** Marca una ruta como pública (no exige token). */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

export const ROLES = 'roles';
/** Limita una ruta a ciertos roles. */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES, roles);

/** Inyecta el usuario autenticado: `@UsuarioActual() usuario: UsuarioJwt`. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioJwt => ctx.switchToHttp().getRequest().usuario,
);
