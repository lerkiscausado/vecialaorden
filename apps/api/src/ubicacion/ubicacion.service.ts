import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { distanciaKm, normalizar } from '../common/texto';
import { Barrio, Ciudad } from '../database/entities';
import { EstadoUsuario } from '../database/enums';

export interface Punto {
  latitud: number;
  longitud: number;
}

export interface MaestroCercano {
  maestroId: number;
  nombre: string;
  correo: string | null;
  celular: string;
  distanciaKm: number;
}

/** Variantes comunes con que la gente escribe las ciudades. */
const ALIAS: Record<string, string> = {
  'cartagena de indias': 'cartagena',
  ctg: 'cartagena',
  'bogota dc': 'bogota',
  'bogota d.c': 'bogota',
  'bogota d.c.': 'bogota',
  'santafe de bogota': 'bogota',
  bta: 'bogota',
  'santiago de cali': 'cali',
  bquilla: 'barranquilla',
};

@Injectable()
export class UbicacionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  ciudadesActivas(): Promise<Ciudad[]> {
    return this.dataSource.getRepository(Ciudad).find({ where: { activa: true }, order: { nombre: 'ASC' } });
  }

  ciudad(id: number): Promise<Ciudad | null> {
    return this.dataSource.getRepository(Ciudad).findOne({ where: { id } });
  }

  /** Reconoce una ciudad (activa o no) dentro de un texto libre. */
  async resolverCiudad(texto: string | null | undefined): Promise<Ciudad | null> {
    if (!texto) return null;
    let t = ` ${normalizar(texto).replace(/[^a-z0-9. ]/g, ' ')} `;
    for (const [alias, nombre] of Object.entries(ALIAS)) {
      t = t.replace(` ${alias} `, ` ${nombre} `);
    }
    const ciudades = await this.dataSource.getRepository(Ciudad).find();
    const coincidencias = ciudades
      .filter((c) => t.includes(` ${c.nombreNormalizado} `) || t.trim() === c.nombreNormalizado)
      .sort((a, b) => b.nombreNormalizado.length - a.nombreNormalizado.length);
    return coincidencias[0] ?? null;
  }

  /** Busca un barrio de la ciudad por lo que escribió la persona. */
  async buscarBarrio(ciudadId: number, texto: string | null | undefined): Promise<Barrio | null> {
    if (!texto) return null;
    const t = normalizar(texto);
    if (t.length < 3) return null;
    const barrios = await this.dataSource.getRepository(Barrio).find({ where: { ciudadId } });
    const exacto = barrios.find((b) => b.nombreNormalizado === t);
    if (exacto) return exacto;
    // El nombre del barrio aparece dentro del texto ("vivo en cedritos, cerca al parque").
    const dentro = barrios
      .filter((b) => b.nombreNormalizado.length >= 4 && ` ${t} `.includes(` ${b.nombreNormalizado} `))
      .sort((a, b) => b.nombreNormalizado.length - a.nombreNormalizado.length);
    if (dentro[0]) return dentro[0];
    // El texto es parte de un solo barrio ("chapinero" → "Chapinero Central").
    const parciales = barrios.filter((b) => t.length >= 4 && b.nombreNormalizado.startsWith(t));
    return parciales.length === 1 ? parciales[0] : null;
  }

  /** Ciudad más cercana a un punto, si está a menos de `maxKm`. */
  async ciudadCercana(punto: Punto, maxKm = 60): Promise<{ ciudad: Ciudad; km: number } | null> {
    const ciudades = await this.dataSource.getRepository(Ciudad).find();
    let mejor: { ciudad: Ciudad; km: number } | null = null;
    for (const ciudad of ciudades) {
      const km = distanciaKm(punto.latitud, punto.longitud, ciudad.latitud, ciudad.longitud);
      if (!mejor || km < mejor.km) mejor = { ciudad, km };
    }
    return mejor && mejor.km <= maxKm ? mejor : null;
  }

  /**
   * Maestros activos de alguna de las áreas cuyo radio de trabajo alcanza el punto.
   * La distancia la calcula MySQL con ST_Distance_Sphere (en metros).
   */
  async maestrosCercanos(
    areaIds: number[],
    punto: Punto,
    excluirUsuarioId?: number,
    limite = 50,
  ): Promise<MaestroCercano[]> {
    if (!areaIds.length) return [];
    const filas: any[] = await this.dataSource.query(
      `SELECT u.id AS maestroId, u.nombre, u.correo, u.celular,
              ST_Distance_Sphere(POINT(u.longitud, u.latitud), POINT(?, ?)) / 1000 AS km
         FROM perfiles_maestro pm
         JOIN usuarios u ON u.id = pm.usuarioId
        WHERE pm.recibeAvisos = 1
          AND u.estado = ?
          AND u.celularVerificado = 1
          AND u.latitud IS NOT NULL AND u.longitud IS NOT NULL
          AND u.id <> ?
          AND EXISTS (SELECT 1 FROM maestro_areas ma WHERE ma.maestroId = pm.usuarioId AND ma.areaId IN (?))
          AND ST_Distance_Sphere(POINT(u.longitud, u.latitud), POINT(?, ?)) <= pm.radioKm * 1000
        ORDER BY km ASC
        LIMIT ?`,
      [
        punto.longitud,
        punto.latitud,
        EstadoUsuario.ACTIVO,
        excluirUsuarioId ?? 0,
        areaIds,
        punto.longitud,
        punto.latitud,
        limite,
      ],
    );
    return filas.map((f) => ({
      maestroId: Number(f.maestroId),
      nombre: f.nombre,
      correo: f.correo,
      celular: f.celular,
      distanciaKm: Math.round(Number(f.km) * 10) / 10,
    }));
  }
}
