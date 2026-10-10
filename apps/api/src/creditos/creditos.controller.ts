import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { RolUsuario } from '../database/enums';
import { CreditosService } from './creditos.service';

@Controller('creditos')
export class CreditosController {
  constructor(private readonly creditos: CreditosService) {}

  /** Historial de movimientos del maestro que inició sesión. */
  @Roles(RolUsuario.MAESTRO)
  @Get('movimientos')
  movimientos(
    @UsuarioActual() usuario: UsuarioJwt,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    return this.creditos.historial(usuario.id, limite);
  }
}
