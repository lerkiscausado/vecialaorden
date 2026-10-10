import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CanalNotificacion } from '../enums';
import { decimalANumero } from '../transformers';
import { Solicitud } from './solicitud.entity';
import { Usuario } from './usuario.entity';

/** Registro de a qué maestros se les avisó de cada solicitud. */
@Entity('notificaciones_solicitud')
@Index('uq_notificacion_solicitud_maestro_canal', ['solicitudId', 'maestroId', 'canal'], { unique: true })
@Index('idx_notificaciones_maestro', ['maestroId', 'creadoEn'])
export class NotificacionSolicitud {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  solicitudId: number;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitudId' })
  solicitud: Solicitud;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maestroId' })
  maestro: Usuario;

  @Column({ type: 'enum', enum: CanalNotificacion })
  canal: CanalNotificacion;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: decimalANumero })
  distanciaKm: number | null;

  @Column({ type: 'datetime', nullable: true })
  enviadaEn: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
