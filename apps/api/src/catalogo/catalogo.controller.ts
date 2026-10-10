import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Publico } from '../auth/decoradores';
import { Area, PaqueteCredito } from '../database/entities';

/** Datos públicos que la web necesita: oficios y paquetes de créditos. */
@Publico()
@Controller()
export class CatalogoController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('areas')
  async areas() {
    const areas = await this.dataSource.getRepository(Area).find({
      where: { activa: true },
      order: { id: 'ASC' },
    });
    return areas.map(({ slug, nombre }) => ({ slug, nombre }));
  }

  @Get('paquetes')
  async paquetes() {
    const paquetes = await this.dataSource.getRepository(PaqueteCredito).find({
      where: { activo: true },
      order: { orden: 'ASC' },
    });
    return paquetes.map(({ id, nombre, precio, creditos }) => ({ id, nombre, precio, creditos }));
  }

  @Get('salud')
  salud() {
    return { ok: true };
  }
}
