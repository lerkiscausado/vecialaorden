import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, NotEquals } from 'class-validator';
import { EstadoSolicitud, EstadoUsuario, EstadoVerificacion } from '../database/enums';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export class PeriodoDto {
  @IsOptional()
  @Max(365, { message: 'El periodo va de 1 a 365 días.' })
  @Min(1, { message: 'El periodo va de 1 a 365 días.' })
  @IsInt({ message: 'El periodo debe ser un número de días.' })
  @Type(() => Number)
  dias?: number;
}

export class FiltroMaestrosDto {
  @IsOptional()
  @Transform(recortar)
  @MaxLength(80)
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsInt({ message: 'La ciudad no es válida.' })
  @Type(() => Number)
  ciudadId?: number;

  @IsOptional()
  @IsEnum(EstadoVerificacion, { message: 'El estado de verificación no es válido.' })
  verificacion?: EstadoVerificacion;
}

export class FiltroPedidosDto {
  @IsOptional()
  @IsEnum(EstadoSolicitud, { message: 'El estado no es válido.' })
  estado?: EstadoSolicitud;

  @IsOptional()
  @IsInt({ message: 'La ciudad no es válida.' })
  @Type(() => Number)
  ciudadId?: number;
}

export class VerificacionDto {
  @IsEnum(EstadoVerificacion, { message: 'El estado de verificación no es válido.' })
  verificacion: EstadoVerificacion;
}

export class EstadoUsuarioDto {
  @IsEnum(EstadoUsuario, { message: 'El estado no es válido.' })
  estado: EstadoUsuario;
}

export class AjusteCreditosDto {
  @NotEquals(0, { message: 'La cantidad no puede ser cero.' })
  @Max(1000, { message: 'El ajuste va de -1.000 a 1.000 créditos.' })
  @Min(-1000, { message: 'El ajuste va de -1.000 a 1.000 créditos.' })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Type(() => Number)
  cantidad: number;

  @Transform(recortar)
  @Length(3, 200, { message: 'Escribe el motivo del ajuste (3 a 200 caracteres).' })
  @IsString({ message: 'Escribe el motivo del ajuste.' })
  motivo: string;
}
