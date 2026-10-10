import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CanalSolicitud, EstadoSolicitud, TamanoTrabajo } from '../enums';
import { decimalANumero } from '../transformers';
import { Area } from './area.entity';
import { Barrio } from './barrio.entity';
import { Usuario } from './usuario.entity';

/** Un trabajo que pide un cliente. */
@Entity('solicitudes')
@Index('idx_solicitudes_estado', ['estado', 'creadoEn'])
@Index('idx_solicitudes_cliente', ['clienteId'])
export class Solicitud {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  /** Código corto para compartir, ej. 7Q4K (usado en el link al cliente). */
  @Column({ length: 12, unique: true })
  codigo: string;

  @Column({ unsigned: true })
  clienteId: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Usuario;

  @Column({ type: 'enum', enum: CanalSolicitud, default: CanalSolicitud.WHATSAPP })
  canal: CanalSolicitud;

  /** Mensaje original del cliente. */
  @Column({ type: 'text' })
  descripcion: string;

  /** Resumen generado por la IA, para mostrar a los maestros. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  resumen: string | null;

  @ManyToMany(() => Area)
  @JoinTable({
    name: 'solicitud_areas',
    joinColumn: { name: 'solicitudId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'areaId', referencedColumnName: 'id' },
  })
  areas: Area[];

  /** Medidas extraídas, ej. { "ancho": 3, "largo": 4, "areaPiso": 12, "areaParedes": 33.6 }. */
  @Column({ type: 'json', nullable: true })
  medidas: Record<string, number> | null;

  @Column({ type: 'enum', enum: TamanoTrabajo, default: TamanoTrabajo.MEDIANO })
  tamano: TamanoTrabajo;

  @Column({ default: false })
  urgente: boolean;

  @Column({ type: 'int', unsigned: true, nullable: true })
  barrioId: number | null;

  @ManyToOne(() => Barrio, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'barrioId' })
  barrio: Barrio | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  barrioTexto: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: decimalANumero })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, transformer: decimalANumero })
  longitud: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  precioRefMin: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  precioRefMax: number | null;

  /** Créditos que cuesta enviar una cotización a esta solicitud. */
  @Column({ type: 'tinyint', unsigned: true, default: 3 })
  creditosPorCotizacion: number;

  @Column({ type: 'tinyint', unsigned: true, default: 5 })
  cuposMax: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  cuposUsados: number;

  @Column({ type: 'enum', enum: EstadoSolicitud, default: EstadoSolicitud.BORRADOR })
  estado: EstadoSolicitud;

  @Column({ type: 'int', unsigned: true, nullable: true })
  maestroAsignadoId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'maestroAsignadoId' })
  maestroAsignado: Usuario | null;

  @Column({ type: 'datetime', nullable: true })
  publicadaEn: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiraEn: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
