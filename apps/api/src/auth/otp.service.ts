import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { CodigoOtp } from '../database/entities';
import { PropositoOtp } from '../database/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const MAX_INTENTOS = 5;
const ESPERA_REENVIO_SEG = 60;
const MAX_CODIGOS_POR_HORA = 5;

/** Códigos de 6 dígitos enviados por WhatsApp. Solo se guarda su HMAC. */
@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(CodigoOtp) private readonly codigos: Repository<CodigoOtp>,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async enviar(celular: string, proposito: PropositoOtp): Promise<void> {
    const ahora = Date.now();
    const recientes = await this.codigos.find({
      where: { celular, creadoEn: MoreThan(new Date(ahora - 60 * 60 * 1000)) },
      order: { creadoEn: 'DESC' },
    });
    if (recientes.length >= MAX_CODIGOS_POR_HORA) {
      throw new HttpException(
        'Pediste demasiados códigos. Espera una hora e intenta de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const ultimo = recientes[0];
    if (ultimo && ahora - ultimo.creadoEn.getTime() < ESPERA_REENVIO_SEG * 1000) {
      throw new HttpException(
        `Espera un minuto antes de pedir otro código.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalida códigos anteriores sin usar: solo vale el último.
    await this.codigos.update({ celular, usadoEn: IsNull() }, { usadoEn: new Date() });

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const minutos = Number(this.config.get('OTP_TTL_MINUTES', 10));
    await this.codigos.save(
      this.codigos.create({
        celular,
        proposito,
        codigoHash: this.hash(celular, codigo),
        expiraEn: new Date(ahora + minutos * 60 * 1000),
      }),
    );
    await this.whatsapp.enviarCodigo(celular, codigo);
  }

  /** Valida el código; si es correcto lo marca como usado. Lanza error si no. */
  async verificar(celular: string, codigo: string): Promise<void> {
    const registro = await this.codigos.findOne({
      where: { celular, usadoEn: IsNull(), expiraEn: MoreThan(new Date()) },
      order: { creadoEn: 'DESC' },
    });
    const invalido = new UnauthorizedException('El código no es válido o ya expiró. Pide uno nuevo.');
    if (!registro) throw invalido;

    if (registro.intentos >= MAX_INTENTOS) {
      await this.codigos.update(registro.id, { usadoEn: new Date() });
      throw invalido;
    }

    const esperado = Buffer.from(registro.codigoHash, 'hex');
    const recibido = Buffer.from(this.hash(celular, codigo.trim()), 'hex');
    if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) {
      await this.codigos.increment({ id: registro.id }, 'intentos', 1);
      throw invalido;
    }

    // Marca como usado solo si nadie lo usó en paralelo.
    const resultado = await this.codigos.update(
      { id: registro.id, usadoEn: IsNull() },
      { usadoEn: new Date() },
    );
    if (!resultado.affected) throw invalido;
  }

  private hash(celular: string, codigo: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('OTP_SECRET'))
      .update(`${celular}:${codigo}`)
      .digest('hex');
  }
}
