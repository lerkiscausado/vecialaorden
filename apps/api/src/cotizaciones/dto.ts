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

const ESTRELLAS = (aspecto: string) => `Califica ${aspecto} de 1 a 5 estrellas.`;

export class CalificarDto {
  /** Honestidad, respeto por la casa, sensación de seguridad. */
  @Max(5, { message: ESTRELLAS('la confianza') })
  @Min(1, { message: ESTRELLAS('la confianza') })
  @IsInt({ message: ESTRELLAS('la confianza') })
  @Type(() => Number)
  confianza: number;

  @Max(5, { message: ESTRELLAS('la calidad del trabajo') })
  @Min(1, { message: ESTRELLAS('la calidad del trabajo') })
  @IsInt({ message: ESTRELLAS('la calidad del trabajo') })
  @Type(() => Number)
  calidad: number;

  @Max(5, { message: ESTRELLAS('la puntualidad') })
  @Min(1, { message: ESTRELLAS('la puntualidad') })
  @IsInt({ message: ESTRELLAS('la puntualidad') })
  @Type(() => Number)
  puntualidad: number;

  /** Respetó el precio y lo acordado. */
  @Max(5, { message: ESTRELLAS('el cumplimiento') })
  @Min(1, { message: ESTRELLAS('el cumplimiento') })
  @IsInt({ message: ESTRELLAS('el cumplimiento') })
  @Type(() => Number)
  cumplimiento: number;

  @IsOptional()
  @Transform(recortar)
  @MaxLength(1000, { message: 'El comentario puede tener máximo 1.000 caracteres.' })
  @IsString()
  comentario?: string;
}
