import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoUsuario, RolUsuario } from '../enums';
import { decimalANumero } from '../transformers';
import { Barrio } from './barrio.entity';
import { Ciudad } from './ciudad.entity';
import { PerfilMaestro } from './perfil-maestro.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 120 })
  nombre: string;

  /** Celular en formato internacional, ej. +573001234567. */
  @Column({ length: 20, unique: true })
  celular: string;

  @Column({ type: 'varchar', length: 160, unique: true, nullable: true })
  correo: string | null;

  /** Puede ser null: quien entra solo con código de WhatsApp no tiene contraseña. */
  @Column({ type: 'varchar', length: 100, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CLIENTE })
  rol: RolUsuario;

  @Column({ type: 'enum', enum: EstadoUsuario, default: EstadoUsuario.ACTIVO })
  estado: EstadoUsuario;

  @Column({ default: false })
  celularVerificado: boolean;

  @Column({ type: 'int', unsigned: true, nullable: true })
  ciudadId: number | null;

  @ManyToOne(() => Ciudad, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ciudadId' })
  ciudad: Ciudad | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  barrioId: number | null;

  @ManyToOne(() => Barrio, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'barrioId' })
  barrio: Barrio | null;

  /** Texto libre del barrio/ciudad cuando no coincide con la tabla de barrios. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  barrioTexto: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: decimalANumero })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: decimalANumero })
  longitud: number | null;

  /** true si la ubicación guardada es el centro del barrio o de la ciudad, no la exacta. */
  @Column({ default: true })
  ubicacionAproximada: boolean;

  /** Fecha en que aceptó el tratamiento de datos (Ley 1581 de 2012). */
  @Column({ type: 'datetime', nullable: true })
  aceptoDatosEn: Date | null;

  @OneToOne(() => PerfilMaestro, (perfil) => perfil.usuario)
  perfilMaestro?: PerfilMaestro;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
