import { Module } from '@nestjs/common';
import { NotificadorService } from './notificador.service';
import { SolicitudesService } from './solicitudes.service';

@Module({
  providers: [SolicitudesService, NotificadorService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
