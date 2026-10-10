import { Module } from '@nestjs/common';
import { CreditosModule } from '../creditos/creditos.module';
import { MaestroCotizacionesController, PedidosController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';

@Module({
  imports: [CreditosModule],
  controllers: [MaestroCotizacionesController, PedidosController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
