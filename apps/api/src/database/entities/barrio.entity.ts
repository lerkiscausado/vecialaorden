import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { decimalANumero } from '../transformers';

/**
 * Barrios con el punto central aproximado. Se usan como respaldo cuando
 * la persona no comparte su ubicación exacta por WhatsApp.
 */
@Entity('barrios')
@Index('uq_barrios_ciudad_nombre', ['ciudad', 'nombre'], { unique: true })
export class Barrio {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  localidad: string | null;

  @Column({ length: 80, default: 'Bogotá' })
  ciudad: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  latitud: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  longitud: number;
}
