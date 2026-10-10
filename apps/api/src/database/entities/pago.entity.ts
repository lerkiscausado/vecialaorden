import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoPago } from '../enums';
import { PaqueteCredito } from './paquete-credito.entity';
import { PerfilMaestro } from './perfil-maestro.entity';

/** Compra de créditos a través de Wompi. */
@Entity('pagos')
@Index('idx_pagos_maestro', ['maestroId', 'creadoEn'])
export class Pago {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => PerfilMaestro, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maestroId', referencedColumnName: 'usuarioId' })
  maestro: PerfilMaestro;

  @Column({ type: 'int', unsigned: true, nullable: true })
  paqueteId: number | null;

  @ManyToOne(() => PaqueteCredito, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paqueteId' })
  paquete: PaqueteCredito | null;

  /** Referencia propia que se envía a Wompi (única). */
  @Column({ length: 64, unique: true })
  referencia: string;

  /** Id de la transacción en Wompi; único para no procesar dos veces el mismo aviso. */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  transaccionId: string | null;

  /** Monto en pesos colombianos. */
  @Column({ type: 'int', unsigned: true })
  monto: number;

  @Column({ type: 'int', unsigned: true })
  creditos: number;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estado: EstadoPago;

  /** NEQUI, PSE, CARD… según lo reporte Wompi. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  metodo: string | null;

  /** Último evento recibido de Wompi, para auditoría. */
  @Column({ type: 'json', nullable: true })
  datosPasarela: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
