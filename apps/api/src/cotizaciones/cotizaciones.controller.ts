import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { RolUsuario } from '../database/enums';
import { CalificacionesService } from './calificaciones.service';
import { CotizacionesService } from './cotizaciones.service';
import { CalificarDto, CotizarDto, ElegirDto, FiltroHistorialDto } from './dto';

/** Los códigos de pedido son 4 a 12 letras o números (se aceptan en minúscula). */
function codigoValido(codigo: string): string {
  const c = String(codigo ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(c)) throw new NotFoundException('El pedido no existe.');
  return c;
}

/** Lo que ve y hace el maestro. */
@Roles(RolUsuario.MAESTRO)
@Controller('maestros/yo')
export class MaestroCotizacionesController {
  constructor(
    private readonly cotizaciones: CotizacionesService,
    private readonly calificaciones: CalificacionesService,
  ) {}

  @Get('calificaciones')
  misCalificaciones(@UsuarioActual() u: UsuarioJwt) {
    return this.calificaciones.delMaestro(u.id);
  }

  @Get('trabajos')
  trabajos(@UsuarioActual() u: UsuarioJwt) {
    return this.cotizaciones.trabajosDisponibles(u.id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(201)
  @Post('trabajos/:codigo/cotizar')
  cotizar(@UsuarioActual() u: UsuarioJwt, @Param('codigo') codigo: string, @Body() dto: CotizarDto) {
    return this.cotizaciones.cotizar(u.id, codigoValido(codigo), dto);
  }

  @Get('cotizaciones')
  historial(@UsuarioActual() u: UsuarioJwt, @Query() filtro: FiltroHistorialDto) {
    return this.cotizaciones.historial(u.id, filtro.estado);
  }
}

/** Los pedidos del cliente (cualquier cuenta puede pedir un servicio). */
@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly cotizaciones: CotizacionesService,
    private readonly calificaciones: CalificacionesService,
  ) {}

  @HttpCode(201)
  @Post(':codigo/calificar')
  async calificar(@UsuarioActual() u: UsuarioJwt, @Param('codigo') codigo: string, @Body() dto: CalificarDto) {
    const c = codigoValido(codigo);
    await this.calificaciones.calificar(u.id, c, dto);
    return this.cotizaciones.detallePedido(u.id, c);
  }

  @Get()
  misPedidos(@UsuarioActual() u: UsuarioJwt) {
    return this.cotizaciones.misPedidos(u.id);
  }

  @Get(':codigo')
  detalle(@UsuarioActual() u: UsuarioJwt, @Param('codigo') codigo: string) {
    return this.cotizaciones.detallePedido(u.id, codigoValido(codigo));
  }

  @HttpCode(200)
  @Post(':codigo/elegir')
  elegir(@UsuarioActual() u: UsuarioJwt, @Param('codigo') codigo: string, @Body() dto: ElegirDto) {
    return this.cotizaciones.elegir(u.id, codigoValido(codigo), dto.cotizacionId);
  }
}
