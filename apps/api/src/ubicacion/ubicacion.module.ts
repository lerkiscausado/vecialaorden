import { Global, Module } from '@nestjs/common';
import { UbicacionController } from './ubicacion.controller';
import { UbicacionService } from './ubicacion.service';

@Global()
@Module({
  controllers: [UbicacionController],
  providers: [UbicacionService],
  exports: [UbicacionService],
})
export class UbicacionModule {}
