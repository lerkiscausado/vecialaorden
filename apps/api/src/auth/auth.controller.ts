import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { enmascararCelular } from '../common/telefono';
import { AuthService } from './auth.service';
import { Publico, UsuarioActual, UsuarioJwt } from './decoradores';
import { LoginDto, RegistroDto, SolicitarCodigoDto, VerificarCodigoDto } from './dto';

/** Límite más estricto para rutas que envían códigos o prueban contraseñas. */
const LIMITE_SENSIBLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
  verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.auth.verificarCodigo(dto.celular, dto.codigo);
  }

  @Publico()
  @Throttle(LIMITE_SENSIBLE)
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('yo')
  yo(@UsuarioActual() usuario: UsuarioJwt) {
    return this.auth.perfil(usuario.id);
  }
}
