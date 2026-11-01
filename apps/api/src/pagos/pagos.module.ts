import { Module } from '@nestjs/common';
import { CreditosModule } from '../creditos/creditos.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [CreditosModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
