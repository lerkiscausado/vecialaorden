import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoMovimientoCredito } from '../enums';
import { PerfilMaestro } from './perfil-maestro.entity';

/**
 * Libro de créditos. Cada entrada se escribe una sola vez y nunca se edita;
 * el saldo es la suma de las cantidades.
 */
@Entity('movimientos_credito')
@Index('idx_movimientos_maestro', ['maestroId', 'creadoEn'])
@Index('uq_movimiento_referencia', ['tipo', 'referenciaTipo', 'referenciaId'], { unique: true })
export class MovimientoCredito {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => PerfilMaestro, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maestroId', referencedColumnName: 'usuarioId' })
  maestro: PerfilMaestro;

  @Column({ type: 'enum', enum: TipoMovimientoCredito })
  tipo: TipoMovimientoCredito;

  /** Positivo suma créditos, negativo los descuenta. */
  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int' })
  saldoResultante: number;

  /**
   * A qué se refiere el movimiento ('pago', 'cotizacion', 'registro'…) y su id.
   * Con el índice único evita, por ejemplo, sumar dos veces el mismo pago.
   */
  @Column({ type: 'varchar', length: 30, nullable: true })
  referenciaTipo: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referenciaId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
