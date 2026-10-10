import { BadRequestException, Body, Controller, Patch } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Roles, UsuarioActual, UsuarioJwt } from '../auth/decoradores';
import { PerfilMaestro, Usuario } from '../database/entities';
import { RolUsuario } from '../database/enums';
import { UbicacionService } from '../ubicacion/ubicacion.service';

export class ZonaDto {
  @IsInt({ message: 'Elige tu ciudad.' })
  @Type(() => Number)
  ciudadId: number;

  @IsOptional()
  @MaxLength(160, { message: 'El barrio es demasiado largo.' })
  @IsString({ message: 'Escribe tu barrio.' })
  barrio?: string;

  /** Ubicación exacta (por ejemplo, la del navegador). Si no viene, se usa el barrio o el centro de la ciudad. */
  @IsOptional()
  @Max(14, { message: 'La ubicación debe estar en Colombia.' })
  @Min(-5, { message: 'La ubicación debe estar en Colombia.' })
  @IsNumber({}, { message: 'La ubicación no es válida.' })
  latitud?: number;

  @IsOptional()
  @Max(-66, { message: 'La ubicación debe estar en Colombia.' })
  @Min(-82, { message: 'La ubicación debe estar en Colombia.' })
  @IsNumber({}, { message: 'La ubicación no es válida.' })
  longitud?: number;

  @IsOptional()
  @Max(60, { message: 'El radio va de 1 a 60 km.' })
  @Min(1, { message: 'El radio va de 1 a 60 km.' })
  @IsInt({ message: 'El radio va de 1 a 60 km.' })
  radioKm?: number;

  @IsOptional()
  @IsBoolean({ message: 'Indica si quieres recibir avisos.' })
  recibeAvisos?: boolean;
}

@Roles(RolUsuario.MAESTRO)
@Controller('maestros')
export class MaestrosController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ubicacion: UbicacionService,
    private readonly auth: AuthService,
  ) {}

  /** El maestro define dónde trabaja: ciudad, barrio o ubicación exacta, y hasta qué distancia. */
  @Patch('yo/zona')
  async zona(@UsuarioActual() usuario: UsuarioJwt, @Body() dto: ZonaDto) {
    const ciudad = await this.ubicacion.ciudad(dto.ciudadId);
    if (!ciudad?.activa) throw new BadRequestException('Por ahora solo funcionamos en Bogotá y Cartagena.');
    if ((dto.latitud === undefined) !== (dto.longitud === undefined)) {
      throw new BadRequestException('Envía latitud y longitud juntas.');
    }

    const barrio = await this.ubicacion.buscarBarrio(ciudad.id, dto.barrio);
    const exacta = dto.latitud !== undefined && dto.longitud !== undefined;
    const punto = exacta
      ? { latitud: dto.latitud!, longitud: dto.longitud! }
      : barrio ?? { latitud: ciudad.latitud, longitud: ciudad.longitud };

    await this.dataSource.transaction(async (m) => {
      await m.update(Usuario, usuario.id, {
        ciudadId: ciudad.id,
        barrioId: barrio?.id ?? null,
        barrioTexto: dto.barrio?.trim() || null,
        latitud: Number(punto.latitud.toFixed(6)),
        longitud: Number(punto.longitud.toFixed(6)),
        ubicacionAproximada: !exacta,
      });
      await m.update(PerfilMaestro, usuario.id, {
        ...(dto.radioKm !== undefined ? { radioKm: dto.radioKm } : {}),
        ...(dto.recibeAvisos !== undefined ? { recibeAvisos: dto.recibeAvisos } : {}),
      });
    });
    return this.auth.perfil(usuario.id);
  }
}
