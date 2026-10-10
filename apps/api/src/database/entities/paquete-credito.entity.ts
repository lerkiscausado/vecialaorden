import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('paquetes_credito')
export class PaqueteCredito {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 60 })
  nombre: string;

  /** Precio en pesos colombianos, IVA incluido si aplica. */
  @Column({ type: 'int', unsigned: true })
  precio: number;

  @Column({ type: 'int', unsigned: true })
  creditos: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  orden: number;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
