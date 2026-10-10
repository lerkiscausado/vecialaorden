import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { SolicitudesModule } from '../solicitudes/solicitudes.module';
import { ConversacionService } from './conversacion.service';
import { SimuladorController } from './simulador.controller';

/**
 * Bot de pedidos. El webhook de WhatsApp (cuando esté la cuenta de Meta)
 * llamará a ConversacionService.procesar(), igual que el simulador.
 */
@Module({
  imports: [IaModule, SolicitudesModule],
  controllers: [SimuladorController],
  providers: [ConversacionService],
  exports: [ConversacionService],
})
export class BotModule {}
