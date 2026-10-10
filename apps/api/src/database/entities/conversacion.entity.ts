import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoConversacion } from '../enums';
import { Solicitud } from './solicitud.entity';
import { Usuario } from './usuario.entity';

/** Estado de la conversación del bot con cada celular. */
@Entity('conversaciones')
export class Conversacion {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 20, unique: true })
  celular: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario | null;

  @Column({ type: 'enum', enum: EstadoConversacion, default: EstadoConversacion.INICIO })
  estado: EstadoConversacion;

  /** Solicitud que se está armando o la última publicada. */
  @Column({ type: 'int', unsigned: true, nullable: true })
  solicitudId: number | null;

  @ManyToOne(() => Solicitud, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'solicitudId' })
  solicitud: Solicitud | null;

  /** Contexto auxiliar del paso actual (ej. cuántas veces se pidió la ubicación). */
  @Column({ type: 'json', nullable: true })
  contexto: Record<string, unknown> | null;

  @Column({ type: 'datetime', nullable: true })
  ultimoMensajeEn: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
