import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MensajeWhatsapp } from '../database/entities';
import { DireccionMensaje } from '../database/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/**
 * Mensajes que la plataforma envía por su cuenta (no como respuesta inmediata
 * del bot): "te llegó una cotización", "te eligieron"…
 * Quedan guardados en mensajes_whatsapp (el simulador los muestra) y, si
 * WhatsApp está configurado, se envían de verdad.
 */
@Injectable()
export class MensajeriaService {
  private readonly logger = new Logger(MensajeriaService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  /** Dirección pública de la web, para los enlaces de los mensajes. */
  urlWeb(ruta = ''): string {
    const base = (this.config.get<string>('WEB_PUBLIC_URL') ?? this.config.get<string>('WEB_ORIGIN') ?? '')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    return `${base || 'https://vecialaorden.com'}${ruta}`;
  }

  /** Nunca lanza error: un aviso que falla no debe tumbar la operación que lo originó. */
  async enviarTexto(celular: string, texto: string, solicitudId: number | null = null): Promise<void> {
    try {
      await this.dataSource.getRepository(MensajeWhatsapp).insert({
        celular,
        direccion: DireccionMensaje.SALIENTE,
        tipo: 'text',
        texto,
        solicitudId,
        contenido: { canal: 'sistema' },
        procesadoEn: new Date(),
      });
      if (this.whatsapp.configurado) {
        await this.whatsapp.enviarTexto(celular, texto);
      } else {
        this.logger.log(`[modo desarrollo] Mensaje a ${celular}: ${texto.replace(/\n+/g, ' ').slice(0, 160)}`);
      }
    } catch (error) {
      this.logger.error(`No se pudo enviar el mensaje a ${celular}`, error as Error);
    }
  }
}
