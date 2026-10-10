import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { DataSource, In } from 'typeorm';
import { AnalisisPedido, areasCalculadas, CREDITOS_POR_TAMANO } from '../bot/analisis';
import { Area, NotificacionSolicitud, Solicitud } from '../database/entities';
import { CanalSolicitud, EstadoSolicitud } from '../database/enums';
import { UbicacionService } from '../ubicacion/ubicacion.service';
import { NotificadorService } from './notificador.service';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para que no se confundan
const HORAS_VIGENCIA = 72;

export interface DetalleSolicitud {
  id: number;
  codigo: string;
  estado: EstadoSolicitud;
  descripcion: string;
  resumen: string | null;
  areas: { slug: string; nombre: string }[];
  ciudad: string | null;
  barrio: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacionAproximada: boolean;
  medidas: Record<string, number> | null;
  tamano: string;
  urgente: boolean;
  creditosPorCotizacion: number;
  cuposMax: number;
  cuposUsados: number;
  maestrosAvisados: { nombre: string; distanciaKm: number | null; canal: string }[];
}

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ubicacion: UbicacionService,
    private readonly notificador: NotificadorService,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(Solicitud);
  }

  async crearBorrador(clienteId: number, descripcion: string, analisis: AnalisisPedido, canal: CanalSolicitud) {
    const solicitud = this.repo.create({
      codigo: await this.codigoNuevo(),
      clienteId,
      canal,
      descripcion: descripcion.slice(0, 5000),
      estado: EstadoSolicitud.BORRADOR,
    });
    await this.aplicarAnalisis(solicitud, analisis);
    return this.repo.save(solicitud);
  }

  /** Copia lo que extrajo la IA a la solicitud (áreas, resumen, medidas, tamaño…). */
  async aplicarAnalisis(solicitud: Solicitud, analisis: AnalisisPedido): Promise<void> {
    const areas = await this.dataSource.getRepository(Area).find({ where: { slug: In(analisis.areas) } });
    // Respeta el orden que dio la IA (el área principal primero).
    solicitud.areas = analisis.areas.map((s) => areas.find((a) => a.slug === s)).filter((a): a is Area => !!a);
    solicitud.resumen = analisis.resumen;
    solicitud.medidas = analisis.medidas ? { ...analisis.medidas, ...areasCalculadas(analisis.medidas) } : null;
    solicitud.tamano = analisis.tamano;
    solicitud.urgente = analisis.urgente;
    solicitud.creditosPorCotizacion = CREDITOS_POR_TAMANO[analisis.tamano];
  }

  /** Reconstruye el análisis desde la solicitud guardada (para aplicar correcciones). */
  analisisDe(solicitud: Solicitud, ciudad: string | null): AnalisisPedido {
    const { ancho, largo, alto } = solicitud.medidas ?? {};
    const medidas = Object.fromEntries(
      Object.entries({ ancho, largo, alto }).filter(([, v]) => typeof v === 'number'),
    ) as Record<string, number>;
    return {
      esSolicitud: true,
      areas: (solicitud.areas ?? []).map((a) => a.slug),
      resumen: solicitud.resumen,
      ciudad,
      barrio: solicitud.barrioTexto,
      medidas: Object.keys(medidas).length ? medidas : null,
      tamano: solicitud.tamano,
      urgente: solicitud.urgente,
    };
  }

  guardar(solicitud: Solicitud) {
    return this.repo.save(solicitud);
  }

  cargar(id: number) {
    return this.repo.findOne({ where: { id }, relations: { areas: true, ciudad: true, barrio: true } });
  }

  /** Publica la solicitud y avisa a los maestros cercanos. Devuelve cuántos fueron avisados. */
  async publicar(solicitud: Solicitud): Promise<number> {
    const ahora = new Date();
    solicitud.estado = EstadoSolicitud.ABIERTA;
    solicitud.publicadaEn = ahora;
    solicitud.expiraEn = new Date(ahora.getTime() + HORAS_VIGENCIA * 60 * 60 * 1000);
    await this.repo.save(solicitud);

    if (solicitud.latitud === null || solicitud.longitud === null) return 0;
    const maestros = await this.ubicacion.maestrosCercanos(
      (solicitud.areas ?? []).map((a) => a.id),
      { latitud: solicitud.latitud, longitud: solicitud.longitud },
      solicitud.clienteId,
    );
    try {
      await this.notificador.avisarNuevaSolicitud(solicitud, maestros);
    } catch (error) {
      // La solicitud ya quedó publicada; un fallo al avisar no debe perderla.
      this.logger.error(`No se pudo avisar a los maestros de #${solicitud.codigo}`, error as Error);
    }
    return maestros.length;
  }

  async cancelar(solicitud: Solicitud): Promise<boolean> {
    const cancelables = [EstadoSolicitud.BORRADOR, EstadoSolicitud.ABIERTA, EstadoSolicitud.CUPOS_LLENOS];
    if (!cancelables.includes(solicitud.estado)) return false;
    await this.repo.update(solicitud.id, { estado: EstadoSolicitud.CANCELADA });
    solicitud.estado = EstadoSolicitud.CANCELADA;
    return true;
  }

  async detalle(id: number): Promise<DetalleSolicitud | null> {
    const s = await this.cargar(id);
    if (!s) return null;
    const avisos = await this.dataSource.getRepository(NotificacionSolicitud).find({
      where: { solicitudId: id },
      relations: { maestro: true },
      order: { distanciaKm: 'ASC' },
    });
    return {
      id: s.id,
      codigo: s.codigo,
      estado: s.estado,
      descripcion: s.descripcion,
      resumen: s.resumen,
      areas: (s.areas ?? []).map((a) => ({ slug: a.slug, nombre: a.nombre })),
      ciudad: s.ciudad?.nombre ?? null,
      barrio: s.barrio?.nombre ?? s.barrioTexto,
      latitud: s.latitud,
      longitud: s.longitud,
      ubicacionAproximada: s.ubicacionAproximada,
      medidas: s.medidas,
      tamano: s.tamano,
      urgente: s.urgente,
      creditosPorCotizacion: s.creditosPorCotizacion,
      cuposMax: s.cuposMax,
      cuposUsados: s.cuposUsados,
      maestrosAvisados: avisos.map((a) => ({ nombre: a.maestro.nombre, distanciaKm: a.distanciaKm, canal: a.canal })),
    };
  }

  private async codigoNuevo(): Promise<string> {
    for (let intento = 0; intento < 10; intento++) {
      const codigo = Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
      if (!(await this.repo.exists({ where: { codigo } }))) return codigo;
    }
    throw new Error('No se pudo generar un código único para la solicitud.');
  }
}
