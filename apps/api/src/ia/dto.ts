import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PropositoIa, ProveedorIa } from '../database/enums';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const vacioANull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

const PROVEEDOR = 'Elige un proveedor: anthropic, openai, gemini u openai_compatible.';

export class CrearConfiguracionIaDto {
  @Transform(recortar)
  @Length(2, 80, { message: 'Ponle un nombre (2 a 80 caracteres).' })
  @IsString({ message: 'Ponle un nombre (2 a 80 caracteres).' })
  nombre: string;

  @IsEnum(ProveedorIa, { message: PROVEEDOR })
  proveedor: ProveedorIa;

  @Transform(recortar)
  @Length(1, 120, { message: 'Escribe o elige el modelo.' })
  @IsString({ message: 'Escribe o elige el modelo.' })
  modelo: string;

  @Transform(recortar)
  @Length(8, 500, { message: 'La clave de API no parece válida.' })
  @IsString({ message: 'Escribe la clave de API.' })
  apiKey: string;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @MaxLength(255, { message: 'La dirección es demasiado larga.' })
  @IsString({ message: 'La dirección no es válida.' })
  baseUrl?: string | null;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @Max(2, { message: 'La temperatura va de 0 a 2.' })
  @Min(0, { message: 'La temperatura va de 0 a 2.' })
  @IsNumber({}, { message: 'La temperatura va de 0 a 2.' })
  @Type(() => Number)
  temperatura?: number | null;

  @IsOptional()
  @Max(64000, { message: 'El máximo de tokens va de 16 a 64000.' })
  @Min(16, { message: 'El máximo de tokens va de 16 a 64000.' })
  @IsInt({ message: 'El máximo de tokens debe ser un número entero.' })
  @Type(() => Number)
  maxTokens?: number;

  @IsOptional()
  @IsEnum(PropositoIa, { message: 'El propósito no es válido.' })
  proposito?: PropositoIa;

  @IsOptional()
  @IsBoolean({ message: 'Indica si queda activa (true o false).' })
  activa?: boolean;
}

/** Igual que crear, pero todo opcional. Si no se envía apiKey, se conserva la guardada. */
export class ActualizarConfiguracionIaDto {
  @IsOptional()
  @Transform(recortar)
  @Length(2, 80, { message: 'Ponle un nombre (2 a 80 caracteres).' })
  @IsString({ message: 'Ponle un nombre (2 a 80 caracteres).' })
  nombre?: string;

  @IsOptional()
  @IsEnum(ProveedorIa, { message: PROVEEDOR })
  proveedor?: ProveedorIa;

  @IsOptional()
  @Transform(recortar)
  @Length(1, 120, { message: 'Escribe o elige el modelo.' })
  @IsString({ message: 'Escribe o elige el modelo.' })
  modelo?: string;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @Length(8, 500, { message: 'La clave de API no parece válida.' })
  @IsString({ message: 'La clave de API no parece válida.' })
  apiKey?: string | null;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @MaxLength(255, { message: 'La dirección es demasiado larga.' })
  @IsString({ message: 'La dirección no es válida.' })
  baseUrl?: string | null;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @Max(2, { message: 'La temperatura va de 0 a 2.' })
  @Min(0, { message: 'La temperatura va de 0 a 2.' })
  @IsNumber({}, { message: 'La temperatura va de 0 a 2.' })
  @Type(() => Number)
  temperatura?: number | null;

  @IsOptional()
  @Max(64000, { message: 'El máximo de tokens va de 16 a 64000.' })
  @Min(16, { message: 'El máximo de tokens va de 16 a 64000.' })
  @IsInt({ message: 'El máximo de tokens debe ser un número entero.' })
  @Type(() => Number)
  maxTokens?: number;

  @IsOptional()
  @IsEnum(PropositoIa, { message: 'El propósito no es válido.' })
  proposito?: PropositoIa;
}

/** Para consultar los modelos disponibles: con una clave nueva o con la de una conexión guardada. */
export class ListarModelosDto {
  @IsEnum(ProveedorIa, { message: PROVEEDOR })
  proveedor: ProveedorIa;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @Length(8, 500, { message: 'La clave de API no parece válida.' })
  @IsString({ message: 'La clave de API no parece válida.' })
  apiKey?: string | null;

  @IsOptional()
  @IsInt({ message: 'La conexión no es válida.' })
  @Type(() => Number)
  configuracionId?: number;

  @IsOptional()
  @Transform(vacioANull)
  @ValidateIf((_o, v) => v !== null)
  @MaxLength(255, { message: 'La dirección es demasiado larga.' })
  @IsString({ message: 'La dirección no es válida.' })
  baseUrl?: string | null;
}
