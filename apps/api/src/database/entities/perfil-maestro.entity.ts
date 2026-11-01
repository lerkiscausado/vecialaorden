import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoVerificacion } from '../enums';
import { decimalANumero } from '../transformers';
import { Area } from './area.entity';
import { Usuario } from './usuario.entity';

@Entity('perfiles_maestro')
export class PerfilMaestro {
  /** Mismo id del usuario: un usuario tiene como máximo un perfil de maestro. */
  @PrimaryColumn({ unsigned: true })
  usuarioId: number;

  @OneToOne(() => Usuario, (usuario) => usuario.perfilMaestro, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  aniosExperiencia: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Hasta qué distancia acepta trabajos. */
  @Column({ type: 'smallint', unsigned: true, default: 10 })
  radioKm: number;

  @Column({ type: 'enum', enum: EstadoVerificacion, default: EstadoVerificacion.PENDIENTE })
  verificacion: EstadoVerificacion;

  /** Si está disponible para recibir avisos de trabajos nuevos. */
  @Column({ default: true })
  recibeAvisos: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, transformer: decimalANumero })
  calificacionPromedio: number;

  /** Promedio del aspecto "confianza" de las reseñas (0 si no tiene). */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, transformer: decimalANumero })
  confianzaPromedio: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  totalResenas: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  trabajosCompletados: number;

  /**
   * Saldo actual de créditos. Es una copia rápida: la fuente de verdad es la
   * suma de movimientos_credito, y ambos se actualizan en la misma transacción.
   */
  @Column({ type: 'int', default: 0 })
  saldoCreditos: number;

  @ManyToMany(() => Area)
  @JoinTable({
    name: 'maestro_areas',
    joinColumn: { name: 'maestroId', referencedColumnName: 'usuarioId' },
    inverseJoinColumn: { name: 'areaId', referencedColumnName: 'id' },
  })
  areas: Area[];

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizadoEn: Date;
}
