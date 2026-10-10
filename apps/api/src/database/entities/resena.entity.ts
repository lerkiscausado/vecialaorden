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
import { Solicitud } from './solicitud.entity';
import { Usuario } from './usuario.entity';

/** Calificación que deja el cliente al maestro al terminar el trabajo. */
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

  /** De 1 a 5. */
  @Column({ type: 'tinyint', unsigned: true })
  calificacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
