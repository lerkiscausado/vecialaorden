import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { RolUsuario } from '../database/enums';
import { AdminService } from './admin.service';
import {
  AjusteCreditosDto,
  EstadoUsuarioDto,
  FiltroMaestrosDto,
  FiltroPedidosDto,
  PeriodoDto,
  VerificacionDto,
} from './dto';

/** Panel administrativo. Solo el superadministrador. */
@Roles(RolUsuario.SUPERADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('resumen')
  resumen(@Query() q: PeriodoDto) {
    return this.admin.resumen(q.dias ?? 30);
  }

  @Get('maestros')
  maestros(@Query() f: FiltroMaestrosDto) {
    return this.admin.maestros(f);
  }

  @Get('pedidos')
  pedidos(@Query() f: FiltroPedidosDto) {
    return this.admin.pedidos(f);
  }

  @Patch('maestros/:id/verificacion')
  verificacion(@Param('id', ParseIntPipe) id: number, @Body() dto: VerificacionDto) {
    return this.admin.cambiarVerificacion(id, dto.verificacion);
  }

  @Patch('usuarios/:id/estado')
  estado(@UsuarioActual() u: UsuarioJwt, @Param('id', ParseIntPipe) id: number, @Body() dto: EstadoUsuarioDto) {
    return this.admin.cambiarEstado(u.id, id, dto.estado);
  }

  @HttpCode(200)
  @Post('maestros/:id/creditos')
  creditos(@UsuarioActual() u: UsuarioJwt, @Param('id', ParseIntPipe) id: number, @Body() dto: AjusteCreditosDto) {
    return this.admin.ajustarCreditos(u.id, id, dto);
  }
}
