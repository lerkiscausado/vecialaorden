import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalANumero } from '../transformers';

/**
 * Ciudades de Colombia. Solo las marcadas como activas reciben solicitudes;
 * las demás sirven para responder "pronto llegamos" y para crecer.
 */
@Entity('ciudades')
export class Ciudad {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 80 })
  nombre: string;

  /** Nombre en minúsculas y sin tildes, para reconocerla en lo que escribe el cliente. */
  @Column({ length: 80, unique: true })
  nombreNormalizado: string;

  @Column({ length: 80 })
  departamento: string;

  /** Código DANE del municipio (ej. 11001 Bogotá, 13001 Cartagena). */
  @Column({ length: 5, unique: true })
  codigoDane: string;

  /** Punto central aproximado, usado cuando no hay una ubicación más precisa. */
  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  latitud: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: decimalANumero })
  longitud: number;

  @Column({ default: false })
  activa: boolean;
}
