import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalANumero } from '../transformers';
import { Ciudad } from './ciudad.entity';

/**
 * Barrios con su punto central aproximado. Se usan como respaldo cuando
 * la persona no comparte su ubicación exacta por WhatsApp.
 */
@Entity('barrios')
@Index('uq_barrios_ciudad_nombre', ['ciudadId', 'nombreNormalizado'], { unique: true })
export class Barrio {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  ciudadId: number;

  @ManyToOne(() => Ciudad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ciudadId' })
  ciudad: Ciudad;

  @Column({ length: 120 })
  nombre: string;

  /** En minúsculas y sin tildes, para buscarlo por lo que escribe el cliente. */
  @Column({ length: 120 })
  nombreNormalizado: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  localidad: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  latitud: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  longitud: number;
}
