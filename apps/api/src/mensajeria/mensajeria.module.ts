import { Global, Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MensajeriaService } from './mensajeria.service';

@Global()
@Module({
  imports: [WhatsappModule],
  providers: [MensajeriaService],
  exports: [MensajeriaService],
})
export class MensajeriaModule {}
