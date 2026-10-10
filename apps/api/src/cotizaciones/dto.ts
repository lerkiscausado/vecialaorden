import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { EstadoCotizacion } from '../database/enums';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export class CotizarDto {
  @Max(100_000_000, { message: 'La mano de obra no puede pasar de 100 millones.' })
  @Min(10_000, { message: 'La mano de obra debe ser de al menos $10.000.' })
  @IsInt({ message: 'Escribe la mano de obra en pesos, sin puntos ni decimales.' })
  @Type(() => Number)
  manoDeObra: number;

  @IsOptional()
  @Max(100_000_000, { message: 'Los materiales no pueden pasar de 100 millones.' })
  @Min(0, { message: 'Los materiales no pueden ser negativos.' })
  @IsInt({ message: 'Escribe los materiales en pesos, sin puntos ni decimales.' })
  @Type(() => Number)
  materiales?: number;

  @IsOptional()
  @Transform(recortar)
  @MaxLength(1000, { message: 'El mensaje puede tener máximo 1.000 caracteres.' })
  @IsString()
  mensaje?: string;

  /** AAAA-MM-DD */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha no es válida.' })
  fechaDisponible?: string;

  @IsOptional()
  @Max(365, { message: 'La duración va de 1 a 365 días.' })
  @Min(1, { message: 'La duración va de 1 a 365 días.' })
  @IsInt({ message: 'La duración debe ser un número de días.' })
  @Type(() => Number)
  duracionDias?: number;
}

export class FiltroHistorialDto {
  @IsOptional()
  @IsIn([...Object.values(EstadoCotizacion), 'todas'], { message: 'El filtro no es válido.' })
  estado?: EstadoCotizacion | 'todas';
}

export class ElegirDto {
  @IsInt({ message: 'Elige una cotización.' })
  @Type(() => Number)
  cotizacionId: number;
}
