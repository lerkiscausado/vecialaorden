import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PropositoOtp } from '../enums';

/** Códigos de un solo uso enviados por WhatsApp. Se guarda solo su hash. */
@Entity('codigos_otp')
@Index('idx_codigos_otp_celular', ['celular', 'creadoEn'])
export class CodigoOtp {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 20 })
  celular: string;

  @Column({ length: 64 })
  codigoHash: string;

  @Column({ type: 'enum', enum: PropositoOtp })
  proposito: PropositoOtp;

  @Column({ type: 'datetime' })
  expiraEn: Date;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  intentos: number;

  @Column({ type: 'datetime', nullable: true })
  usadoEn: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;
}
