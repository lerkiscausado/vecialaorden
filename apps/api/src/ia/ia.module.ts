import { Module } from '@nestjs/common';
import { IaAdminController } from './ia-admin.controller';
import { IaAdminService } from './ia-admin.service';
import { IaService } from './ia.service';

/**
 * IA multiproveedor. Otros módulos inyectan `IaService` y llaman
 * `completar()` o `completarJson()` sin saber qué modelo hay detrás.
 */
@Module({
  controllers: [IaAdminController],
  providers: [IaService, IaAdminService],
  exports: [IaService],
})
export class IaModule {}
