import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Áreas de servicio: estuco y pintura, drywall, plomería, etc. */
@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 60, unique: true })
  slug: string;

  @Column({ length: 100 })
  nombre: string;

  /** Palabras clave de apoyo para clasificar pedidos (además de la IA). */
  @Column({ type: 'json', nullable: true })
  palabrasClave: string[] | null;

  /** Unidad del precio de referencia: m2, visita, trabajo… */
  @Column({ type: 'varchar', length: 30, nullable: true })
  unidadReferencia: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  precioRefMin: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  precioRefMax: number | null;

  @Column({ default: true })
  activa: boolean;
}
