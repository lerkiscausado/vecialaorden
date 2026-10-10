import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario } from '../database/enums';
import { ES_PUBLICO, ROLES, UsuarioJwt } from './decoradores';

/**
 * Guard global: toda ruta exige un JWT válido en "Authorization: Bearer <token>"
 * salvo las marcadas con @Publico(). También aplica @Roles().
 *
 * PENDIENTE: hoy solo hay token de acceso. Más adelante pasar a
 * access token corto + refresh token en cookie httpOnly.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, objetivos)) return true;

    const peticion = ctx.switchToHttp().getRequest();
    const [tipo, token] = String(peticion.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión para continuar.');

    let usuario: UsuarioJwt;
    try {
      const datos = await this.jwt.verifyAsync<{ sub: number; rol: RolUsuario }>(token);
      usuario = { id: Number(datos.sub), rol: datos.rol };
    } catch {
      throw new UnauthorizedException('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    peticion.usuario = usuario;

    const roles = this.reflector.getAllAndOverride<RolUsuario[] | undefined>(ROLES, objetivos);
    if (roles?.length && !tienePermiso(usuario.rol, roles)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}

/**
 * El superadmin entra a todo. El admin entra a todo excepto lo exclusivo
 * del superadmin. Los demás, solo a lo de su rol.
 */
export function tienePermiso(rol: RolUsuario, permitidos: RolUsuario[]): boolean {
  if (rol === RolUsuario.SUPERADMIN) return true;
  if (permitidos.includes(rol)) return true;
  return rol === RolUsuario.ADMIN && !permitidos.every((r) => r === RolUsuario.SUPERADMIN);
}
