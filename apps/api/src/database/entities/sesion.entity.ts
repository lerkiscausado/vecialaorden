import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

/**
 * Token de renovación (refresh token). Se guarda solo su hash SHA-256.
 * Cada renovación crea uno nuevo de la misma "familia" y marca el anterior
 * como reemplazado; si alguien reutiliza uno ya reemplazado, se revoca la
 * familia completa (señal de robo).
 */
@Entity('sesiones')
@Index('idx_sesiones_usuario', ['usuarioId', 'revocadaEn'])
@Index('idx_sesiones_familia', ['familia'])
export class Sesion {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ unsigned: true })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  /** Todos los tokens que vienen del mismo inicio de sesión. */
  @Column({ type: 'char', length: 32 })
  familia: string;

  @Index('uq_sesiones_hash', { unique: true })
  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'datetime' })
  expiraEn: Date;

  @Column({ type: 'datetime', nullable: true })
  reemplazadaEn: Date | null;

  @Column({ type: 'datetime', nullable: true })
  revocadaEn: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agente: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
