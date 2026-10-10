import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DireccionMensaje } from '../enums';
import { Solicitud } from './solicitud.entity';

/**
 * Mensajes de WhatsApp recibidos y enviados. El id de Meta es único,
 * así un mensaje reenviado por Meta no se procesa dos veces.
 */
@Entity('mensajes_whatsapp')
@Index('idx_mensajes_celular', ['celular', 'creadoEn'])
export class MensajeWhatsapp {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128, unique: true, nullable: true })
  waMessageId: string | null;

  @Column({ length: 20 })
  celular: string;

  @Column({ type: 'enum', enum: DireccionMensaje })
  direccion: DireccionMensaje;

  /** text, location, image, template, interactive… */
  @Column({ length: 30 })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  texto: string | null;

  @Column({ type: 'json', nullable: true })
  contenido: Record<string, unknown> | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  solicitudId: number | null;

  @ManyToOne(() => Solicitud, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'solicitudId' })
  solicitud: Solicitud | null;

  @Column({ type: 'datetime', nullable: true })
  procesadoEn: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
