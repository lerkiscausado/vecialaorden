import { Controller, Get } from '@nestjs/common';
import { Publico } from '../auth/decoradores';
import { UbicacionService } from './ubicacion.service';

@Publico()
@Controller('ciudades')
export class UbicacionController {
  constructor(private readonly ubicacion: UbicacionService) {}

  /** Ciudades donde ya funciona el servicio. */
  @Get()
  async ciudades() {
    const lista = await this.ubicacion.ciudadesActivas();
    return lista.map(({ id, nombre, departamento }) => ({ id, nombre, departamento }));
  }
}
