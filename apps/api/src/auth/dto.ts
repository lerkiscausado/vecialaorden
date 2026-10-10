import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RolUsuario } from '../database/enums';

/*
 * Nota: con `stopAtFirstError`, class-validator evalúa los decoradores de
 * abajo hacia arriba. Por eso la validación de tipo va al final de cada campo.
 */

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const minusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() || undefined : value;

const CELULAR = 'Escribe un número de celular válido.';

export class RegistroDto {
  @Transform(recortar)
  @Length(3, 120, { message: 'Escribe tu nombre completo (mínimo 3 letras).' })
  @IsString({ message: 'Escribe tu nombre completo (mínimo 3 letras).' })
  nombre: string;

  @MaxLength(25, { message: CELULAR })
  @IsString({ message: CELULAR })
  celular: string;

  @IsOptional()
  @Transform(minusculas)
  @MaxLength(160, { message: 'El correo es demasiado largo.' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  correo?: string;

  @IsOptional()
  @MaxLength(72, { message: 'La contraseña puede tener máximo 72 caracteres.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @IsString({ message: 'La contraseña debe tener al menos 8 caracteres.' })
  password?: string;

  @IsIn([RolUsuario.CLIENTE, RolUsuario.MAESTRO], { message: 'Elige si necesitas un servicio o lo ofreces.' })
  rol: RolUsuario.CLIENTE | RolUsuario.MAESTRO;

  /** Obligatoria para maestros. */
  @ValidateIf((o: RegistroDto) => o.rol === RolUsuario.MAESTRO || o.ciudadId !== undefined)
  @IsInt({ message: 'Elige tu ciudad.' })
  @Type(() => Number)
  ciudadId?: number;

  @IsOptional()
  @Transform(recortar)
  @MaxLength(160, { message: 'El barrio es demasiado largo.' })
  @IsString({ message: 'Escribe tu barrio.' })
  barrio?: string;

  @Equals(true, { message: 'Debes autorizar el tratamiento de tus datos personales.' })
  aceptaDatos: boolean;

  /** Solo maestros: slugs de las áreas en las que trabaja. */
  @ValidateIf((o: RegistroDto) => o.rol === RolUsuario.MAESTRO)
  @IsString({ each: true, message: 'Alguno de los oficios no es válido.' })
  @ArrayMaxSize(7, { message: 'Puedes elegir máximo 7 oficios.' })
  @ArrayMinSize(1, { message: 'Elige al menos un oficio.' })
  @IsArray({ message: 'Elige al menos un oficio.' })
  areas?: string[];

  /** Solo maestros. */
  @ValidateIf((o: RegistroDto) => o.rol === RolUsuario.MAESTRO)
  @Max(60, { message: 'Los años de experiencia deben estar entre 0 y 60.' })
  @Min(0, { message: 'Los años de experiencia deben estar entre 0 y 60.' })
  @IsInt({ message: 'Indica tus años de experiencia.' })
  aniosExperiencia?: number;
}

export class SolicitarCodigoDto {
  @MaxLength(25, { message: CELULAR })
  @IsString({ message: CELULAR })
  celular: string;
}

export class VerificarCodigoDto {
  @MaxLength(25, { message: CELULAR })
  @IsString({ message: CELULAR })
  celular: string;

  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos.' })
  @IsString({ message: 'El código tiene 6 dígitos.' })
  codigo: string;
}

export class LoginDto {
  /** Correo o celular. */
  @Transform(recortar)
  @Length(3, 160, { message: 'Escribe tu correo o celular.' })
  @IsString({ message: 'Escribe tu correo o celular.' })
  usuario: string;

  @Length(1, 72, { message: 'Escribe tu contraseña.' })
  @IsString({ message: 'Escribe tu contraseña.' })
  password: string;
}
