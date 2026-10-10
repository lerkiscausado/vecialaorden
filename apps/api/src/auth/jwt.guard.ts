import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Usuario } from '../database/entities';
import { EstadoUsuario, RolUsuario } from '../database/enums';
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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, objetivos)) return true;

    const peticion = ctx.switchToHttp().getRequest();
    const [tipo, token] = String(peticion.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión para continuar.');

    let id: number;
    try {
      const datos = await this.jwt.verifyAsync<{ sub: number; rol: RolUsuario }>(token);
      id = Number(datos.sub);
    } catch {
      throw new UnauthorizedException('Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    // El rol y el estado se leen de la base en cada petición: así una suspensión
    // o un cambio de rol aplica de inmediato, sin esperar a que venza el token.
    const actual = await this.dataSource
      .getRepository(Usuario)
      .findOne({ where: { id }, select: { id: true, rol: true, estado: true } });
    if (!actual) throw new UnauthorizedException('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
    if (actual.estado !== EstadoUsuario.ACTIVO) {
      throw new ForbiddenException('Tu cuenta está suspendida. Escríbenos para revisarla.');
    }
    const usuario: UsuarioJwt = { id: actual.id, rol: actual.rol };
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
