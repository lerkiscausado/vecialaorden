import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PropositoIa, ProveedorIa } from '../enums';
import { ConfiguracionIa } from './configuracion-ia.entity';

/** Cada llamada a un modelo de IA: para controlar consumo, costos y errores. */
@Entity('registros_ia')
@Index('idx_registros_ia_fecha', ['creadoEn'])
export class RegistroIa {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  configuracionId: number | null;

  @ManyToOne(() => ConfiguracionIa, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'configuracionId' })
  configuracion: ConfiguracionIa | null;

  @Column({ type: 'enum', enum: ProveedorIa })
  proveedor: ProveedorIa;

  @Column({ length: 120 })
  modelo: string;

  @Column({ type: 'enum', enum: PropositoIa })
  proposito: PropositoIa;

  @Column({ type: 'int', unsigned: true, nullable: true })
  tokensEntrada: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  tokensSalida: number | null;

  @Column({ type: 'int', unsigned: true })
  duracionMs: number;

  @Column()
  exito: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
