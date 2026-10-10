import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalANumero } from '../transformers';
import { Solicitud } from './solicitud.entity';
import { Usuario } from './usuario.entity';

/**
 * Calificación que deja el cliente al maestro al terminar el trabajo.
 * Cada aspecto va de 1 a 5. La confianza se muestra aparte porque es lo
 * que más pesa cuando alguien deja entrar a un maestro a su casa.
 */
@Entity('resenas')
@Index('idx_resenas_maestro', ['maestroId', 'creadoEn'])
export class Resena {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  /** Una reseña por solicitud (el índice único lo crea la relación uno a uno). */
  @Column({ unsigned: true })
  solicitudId: number;

  @OneToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitudId' })
  solicitud: Solicitud;

  @Column({ unsigned: true })
  clienteId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Usuario;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maestroId' })
  maestro: Usuario;

  /** Honestidad, respeto por la casa, sensación de seguridad. */
  @Column({ type: 'tinyint', unsigned: true })
  confianza: number;

  /** Calidad del trabajo terminado. */
  @Column({ type: 'tinyint', unsigned: true })
  calidad: number;

  @Column({ type: 'tinyint', unsigned: true })
  puntualidad: number;

  /** Respetó el precio y lo acordado. */
  @Column({ type: 'tinyint', unsigned: true })
  cumplimiento: number;

  /** Promedio de los cuatro aspectos (1.00 a 5.00). */
  @Column({ type: 'decimal', precision: 3, scale: 2, transformer: decimalANumero })
  calificacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
