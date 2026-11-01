import { Body, Controller, Get, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Publico, Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { RolUsuario } from '../database/enums';
import { PagosService } from './pagos.service';
import { EventoWompi } from './wompi';

export class ComprarDto {
  @IsInt({ message: 'Elige un paquete.' })
  @Type(() => Number)
  paqueteId: number;
}

export class ConfirmarDto {
  @Matches(/^VAO-[A-Z0-9]+-[A-F0-9]{8}$/, { message: 'Referencia de pago inválida.' })
  @IsString({ message: 'Referencia de pago inválida.' })
  referencia: string;

  @IsOptional()
  @MaxLength(64, { message: 'Transacción inválida.' })
  @IsString({ message: 'Transacción inválida.' })
  transaccionId?: string;
}

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Roles(RolUsuario.MAESTRO)
  @Get()
  misPagos(@UsuarioActual() u: UsuarioJwt) {
    return this.pagos.misPagos(u.id);
  }

  @Roles(RolUsuario.MAESTRO)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(201)
  @Post()
  comprar(@UsuarioActual() u: UsuarioJwt, @Body() dto: ComprarDto) {
    return this.pagos.crear(u.id, dto.paqueteId);
  }

  @Roles(RolUsuario.MAESTRO)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('confirmar')
  confirmar(@UsuarioActual() u: UsuarioJwt, @Body() dto: ConfirmarDto) {
    return this.pagos.confirmar(u.id, dto.referencia, dto.transaccionId);
  }

  /** URL de eventos que se registra en el panel de Wompi. */
  @Publico()
  @SkipThrottle()
  @HttpCode(200)
  @Post('wompi/eventos')
  async eventos(@Body() evento: EventoWompi, @Headers('x-event-checksum') checksum?: string) {
    if (!(await this.pagos.recibirEvento(evento, checksum))) throw new UnauthorizedException('Firma inválida.');
    return { ok: true };
  }
}
