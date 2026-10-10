import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoVerificacion, TipoDocumento } from '../enums';
import { PerfilMaestro } from './perfil-maestro.entity';

/** Documentos privados del maestro (guardados en Google Drive). */
@Entity('documentos_maestro')
@Index('idx_documentos_maestro', ['maestroId'])
export class DocumentoMaestro {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  maestroId: number;

  @ManyToOne(() => PerfilMaestro, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maestroId', referencedColumnName: 'usuarioId' })
  maestro: PerfilMaestro;

  @Column({ type: 'enum', enum: TipoDocumento })
  tipo: TipoDocumento;

  /** Id del archivo en Google Drive. */
  @Column({ length: 120 })
  driveFileId: string;

  @Column({ length: 200 })
  nombreArchivo: string;

  @Column({ type: 'enum', enum: EstadoVerificacion, default: EstadoVerificacion.PENDIENTE })
  estado: EstadoVerificacion;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
