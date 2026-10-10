import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Envío de mensajes por la WhatsApp Cloud API de Meta.
 * Sin WHATSAPP_TOKEN (desarrollo) los mensajes no se envían: se escriben en la consola.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  get configurado(): boolean {
    return Boolean(this.config.get('WHATSAPP_TOKEN') && this.config.get('WHATSAPP_PHONE_NUMBER_ID'));
  }

  /**
   * Envía el código de verificación con la plantilla de autenticación aprobada en Meta.
   * Las plantillas de autenticación llevan el código en el cuerpo y en el botón "Copiar código".
   */
  async enviarCodigo(celular: string, codigo: string): Promise<void> {
    if (!this.configurado) {
      if (this.config.get('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('El envío de códigos por WhatsApp no está configurado.');
      }
      this.logger.warn(`[modo desarrollo] Código para ${celular}: ${codigo}`);
      return;
    }

    await this.enviar({
      messaging_product: 'whatsapp',
      to: celular.replace('+', ''),
      type: 'template',
      template: {
        name: this.config.get('WHATSAPP_OTP_TEMPLATE', 'codigo_verificacion'),
        language: { code: this.config.get('WHATSAPP_TEMPLATE_LANG', 'es') },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: codigo }] },
        ],
      },
    });
  }

  private async enviar(cuerpo: Record<string, unknown>): Promise<void> {
    const version = this.config.get('WHATSAPP_API_VERSION', 'v21.0');
    const phoneId = this.config.get('WHATSAPP_PHONE_NUMBER_ID');
    const respuesta = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('WHATSAPP_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      this.logger.error(`WhatsApp respondió ${respuesta.status}: ${detalle}`);
      throw new ServiceUnavailableException('No pudimos enviar el mensaje de WhatsApp. Intenta de nuevo.');
    }
  }
}
