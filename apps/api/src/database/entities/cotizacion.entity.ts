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
import { EstadoCotizacion } from '../enums';
import { Solicitud } from './solicitud.entity';
import { Usuario } from './usuario.entity';

/** Precio que un maestro envía para una solicitud. Un maestro cotiza una sola vez por solicitud. */
@Entity('cotizaciones')
@Index('uq_cotizacion_solicitud_maestro', ['solicitudId', 'maestroId'], { unique: true })
@Index('idx_cotizaciones_maestro', ['maestroId', 'creadoEn'])
export class Cotizacion {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  solicitudId: number;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitudId' })
  solicitud: Solicitud;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'maestroId' })
  maestro: Usuario;

  /** Precio total en pesos colombianos. */
  @Column({ type: 'int', unsigned: true })
  precioTotal: number;

  /** Desglose exigido por el Estatuto del Consumidor (Ley 1480 de 2011). */
  @Column({ type: 'int', unsigned: true })
  manoDeObra: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  materiales: number;

  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  @Column({ type: 'date', nullable: true })
  fechaDisponible: string | null;

  @Column({ type: 'smallint', unsigned: true, nullable: true })
  duracionDias: number | null;

  @Column({ type: 'tinyint', unsigned: true })
  creditosCobrados: number;

  @Column({ type: 'enum', enum: EstadoCotizacion, default: EstadoCotizacion.ENVIADA })
  estado: EstadoCotizacion;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
