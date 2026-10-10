import { Module } from '@nestjs/common';
import { CreditosModule } from '../creditos/creditos.module';
import { MaestroCotizacionesController, PedidosController } from './cotizaciones.controller';
import { CalificacionesService } from './calificaciones.service';
import { CotizacionesService } from './cotizaciones.service';

@Module({
  imports: [CreditosModule],
  controllers: [MaestroCotizacionesController, PedidosController],
  providers: [CotizacionesService, CalificacionesService],
})
export class CotizacionesModule {}
