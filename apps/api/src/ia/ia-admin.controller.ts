import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { RolUsuario } from '../database/enums';
import { ActualizarConfiguracionIaDto, CrearConfiguracionIaDto, ListarModelosDto } from './dto';
import { IaAdminService } from './ia-admin.service';

/** Configuración de modelos de IA. Solo superadministrador. */
@Roles(RolUsuario.SUPERADMIN)
@Controller('admin/ia')
export class IaAdminController {
  constructor(private readonly admin: IaAdminService) {}

  @Get('proveedores')
  proveedores() {
    return this.admin.proveedores();
  }

  @Get('configuraciones')
  listar() {
    return this.admin.listar();
  }

  @Post('configuraciones')
  crear(@Body() dto: CrearConfiguracionIaDto, @UsuarioActual() usuario: UsuarioJwt) {
    return this.admin.crear(dto, usuario.id);
  }

  @Patch('configuraciones/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarConfiguracionIaDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.admin.actualizar(id, dto, usuario.id);
  }

  @HttpCode(200)
  @Post('configuraciones/:id/activar')
  activar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioJwt) {
    return this.admin.activar(id, usuario.id);
  }

  @HttpCode(200)
  @Post('configuraciones/:id/desactivar')
  desactivar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioJwt) {
    return this.admin.desactivar(id, usuario.id);
  }

  @HttpCode(204)
  @Delete('configuraciones/:id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.admin.eliminar(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('configuraciones/:id/probar')
  probar(@Param('id', ParseIntPipe) id: number) {
    return this.admin.probar(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('modelos')
  modelos(@Body() dto: ListarModelosDto) {
    return this.admin.listarModelos(dto);
  }

  @Get('uso')
  uso(@Query('dias', new ParseIntPipe({ optional: true })) dias?: number) {
    return this.admin.uso(dias);
  }
}
