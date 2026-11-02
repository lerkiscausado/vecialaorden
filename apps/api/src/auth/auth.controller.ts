import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { enmascararCelular } from '../common/telefono';
import { AuthService, Sesion } from './auth.service';
import { Publico, UsuarioActual, UsuarioJwt } from './decoradores';
import { LoginDto, RegistroDto, SolicitarCodigoDto, VerificarCodigoDto } from './dto';
import { DatosCliente, SesionesService } from './sesiones.service';

/** Cookie httpOnly con el token de renovación. Solo viaja a /auth. */
export const COOKIE_RENOVACION = 'veci_renovacion';

/** Lee una cookie del encabezado (sin depender de cookie-parser). */
function leerCookie(req: Request, nombre: string): string | undefined {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) {
      try {
        return decodeURIComponent(parte.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Las rutas que usan la cookie exigen este encabezado: un formulario de otro
 * sitio no puede enviarlo sin pasar por CORS (protección contra CSRF).
 */
function exigirEncabezado(req: Request): void {
  if (req.headers['x-veci'] !== '1') throw new BadRequestException('Petición inválida.');
}

/** Límite más estricto para rutas que envían códigos o prueban contraseñas. */
const LIMITE_SENSIBLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sesiones: SesionesService,
    private readonly config: ConfigService,
  ) {}

  private opcionesCookie(): CookieOptions {
    const seguro = this.config.get('COOKIE_SECURE') ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false');
    const dominio = this.config.get<string>('COOKIE_DOMAIN')?.trim();
    return {
      httpOnly: true,
      secure: seguro === 'true',
      sameSite: 'lax',
      path: '/auth',
      ...(dominio ? { domain: dominio } : {}),
    };
  }

  private cliente(req: Request): DatosCliente {
    return { agente: String(req.headers['user-agent'] ?? ''), ip: req.ip };
  }

  /** Entrega el token de acceso en el cuerpo y el de renovación en la cookie. */
  private async abrirSesion(sesion: Sesion, req: Request, res: Response): Promise<Sesion> {
    const renovacion = await this.sesiones.emitir(sesion.usuario.id, this.cliente(req));
    res.cookie(COOKIE_RENOVACION, renovacion, { ...this.opcionesCookie(), maxAge: this.sesiones.diasVigencia * 86_400_000 });
    return sesion;
  }

  @Publico()
  @Throttle(LIMITE_SENSIBLE)
  @Post('registro')
  async registro(@Body() dto: RegistroDto) {
    const { celular } = await this.auth.registrar(dto);
    return {
      celular,
      mensaje: `Te enviamos un código por WhatsApp al ${enmascararCelular(celular)}.`,
    };
  }

  @Publico()
  @Throttle(LIMITE_SENSIBLE)
  @HttpCode(200)
  @Post('codigo')
  async solicitarCodigo(@Body() dto: SolicitarCodigoDto) {
    const { celular } = await this.auth.solicitarCodigo(dto.celular);
    return {
      celular,
      mensaje: `Si el número ${enmascararCelular(celular)} tiene cuenta, te llegará un código por WhatsApp.`,
    };
  }

  @Publico()
  @Throttle(LIMITE_SENSIBLE)
  @HttpCode(200)
  @Post('codigo/verificar')
  async verificarCodigo(@Body() dto: VerificarCodigoDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.abrirSesion(await this.auth.verificarCodigo(dto.celular, dto.codigo), req, res);
  }

  @Publico()
  @Throttle(LIMITE_SENSIBLE)
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.abrirSesion(await this.auth.login(dto), req, res);
  }

  /** Cambia la cookie de renovación por un token de acceso nuevo (y rota la cookie). */
  @Publico()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('renovar')
  async renovar(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    exigirEncabezado(req);
    try {
      const { usuarioId, token } = await this.sesiones.renovar(leerCookie(req, COOKIE_RENOVACION), this.cliente(req));
      res.cookie(COOKIE_RENOVACION, token, { ...this.opcionesCookie(), maxAge: this.sesiones.diasVigencia * 86_400_000 });
      return { token: await this.auth.tokenDeAcceso(usuarioId) };
    } catch (err) {
      const codigo = (err as { getResponse?: () => unknown }).getResponse?.() as { codigo?: string } | undefined;
      if (codigo?.codigo !== 'reintentar') res.clearCookie(COOKIE_RENOVACION, this.opcionesCookie());
      throw err;
    }
  }

  /** Cierra la sesión de este dispositivo. Funciona aunque el token de acceso ya haya vencido. */
  @Publico()
  @HttpCode(200)
  @Post('salir')
  async salir(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    exigirEncabezado(req);
    await this.sesiones.cerrar(leerCookie(req, COOKIE_RENOVACION));
    res.clearCookie(COOKIE_RENOVACION, this.opcionesCookie());
    return { ok: true };
  }

  /** Cierra la sesión en todos los dispositivos. */
  @HttpCode(200)
  @Post('salir-todo')
  async salirTodo(@UsuarioActual() usuario: UsuarioJwt, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    exigirEncabezado(req);
    await this.sesiones.cerrarTodas(usuario.id);
    res.clearCookie(COOKIE_RENOVACION, this.opcionesCookie());
    return { ok: true };
  }

  @Get('yo')
  yo(@UsuarioActual() usuario: UsuarioJwt) {
    return this.auth.perfil(usuario.id);
  }
}
