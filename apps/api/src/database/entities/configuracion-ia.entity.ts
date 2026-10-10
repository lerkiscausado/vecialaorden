import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropositoIa, ProveedorIa } from '../enums';
import { decimalANumero } from '../transformers';

/**
 * Una conexión a un modelo de IA (Claude, ChatGPT, Gemini o compatible con OpenAI).
 * Solo una puede estar activa por propósito; la elige el superadmin.
 */
@Entity('configuraciones_ia')
@Index('idx_configuraciones_ia_proposito', ['proposito', 'activa'])
export class ConfiguracionIa {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  /** Nombre para reconocerla, ej. "Claude Haiku - producción". */
  @Column({ length: 80 })
  nombre: string;

  @Column({ type: 'enum', enum: ProveedorIa })
  proveedor: ProveedorIa;

  /** Id exacto del modelo según el proveedor. */
  @Column({ length: 120 })
  modelo: string;

  /** Clave del proveedor cifrada con AES-256-GCM. Nunca se devuelve al cliente. */
  @Column({ type: 'text', select: false })
  apiKeyCifrada: string;

  /** Últimos 4 caracteres de la clave, solo para mostrarla enmascarada. */
  @Column({ length: 8 })
  apiKeyFinal: string;

  /** Solo para "compatible con OpenAI" (o para cambiar la URL de un proveedor). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  baseUrl: string | null;

  /** Null = usar el valor por defecto del modelo (algunos modelos no aceptan temperatura). */
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, transformer: decimalANumero })
  temperatura: number | null;

  @Column({ type: 'int', unsigned: true, default: 1024 })
  maxTokens: number;

  @Column({ type: 'enum', enum: PropositoIa, default: PropositoIa.ANALISIS_SOLICITUDES })
  proposito: PropositoIa;

  @Column({ default: false })
  activa: boolean;

  @Column({ type: 'int', unsigned: true, nullable: true })
  actualizadoPorId: number | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
