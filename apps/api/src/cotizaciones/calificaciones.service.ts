import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PerfilMaestro, Resena, Solicitud, Usuario } from '../database/entities';
import { EstadoSolicitud } from '../database/enums';
import { MensajeriaService } from '../mensajeria/mensajeria.service';
import { CalificarDto } from './dto';
import { confianzaBaja } from './ranking';

export const ASPECTOS = ['confianza', 'calidad', 'puntualidad', 'cumplimiento'] as const;
export type Aspecto = (typeof ASPECTOS)[number];

const redondear = (n: number) => Math.round(n * 100) / 100;
const estrellas = (n: number) => n.toFixed(1);

@Injectable()
export class CalificacionesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mensajeria: MensajeriaService,
  ) {}

  /** El cliente califica al maestro elegido; el pedido queda como terminado. */
  async calificar(clienteId: number, codigo: string, dto: CalificarDto) {
    const { resena, maestroId } = await this.dataSource.transaction(async (m) => {
      const s = await m.findOne(Solicitud, { where: { codigo, clienteId }, lock: { mode: 'pessimistic_write' } });
      if (!s) throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
      if (await m.exists(Resena, { where: { solicitudId: s.id } })) {
        throw new ConflictException('Ya calificaste este trabajo. ¡Gracias!');
      }
      if (s.estado !== EstadoSolicitud.ASIGNADA || !s.maestroAsignadoId) {
        throw new BadRequestException('Solo puedes calificar cuando ya elegiste un maestro para este pedido.');
      }

      const calificacion = redondear(ASPECTOS.reduce((suma, a) => suma + dto[a], 0) / ASPECTOS.length);
      const resena = m.create(Resena, {
        solicitudId: s.id,
        clienteId,
        maestroId: s.maestroAsignadoId,
        confianza: dto.confianza,
        calidad: dto.calidad,
        puntualidad: dto.puntualidad,
        cumplimiento: dto.cumplimiento,
        calificacion,
        comentario: dto.comentario ?? null,
      });
      await m.save(resena);
      await m.update(Solicitud, s.id, { estado: EstadoSolicitud.COMPLETADA });
      await this.recalcular(m, s.maestroAsignadoId);
      return { resena, maestroId: s.maestroAsignadoId };
    });

    const [maestro, cliente] = await Promise.all([
      this.dataSource.getRepository(Usuario).findOne({ where: { id: maestroId } }),
      this.dataSource.getRepository(Usuario).findOne({ where: { id: clienteId } }),
    ]);
    if (maestro) {
      await this.mensajeria.enviarTexto(
        maestro.celular,
        `⭐ ${cliente?.nombre.split(' ')[0] ?? 'Tu cliente'} calificó tu trabajo *#${codigo}*: ` +
          `*${estrellas(resena.calificacion)}* de 5 · Confianza *${resena.confianza}* de 5.` +
          (resena.comentario ? `\n\n“${resena.comentario.slice(0, 300)}”` : '') +
          `\n\nMira todas tus calificaciones en tu panel: ${this.mensajeria.urlWeb('/panel')}`,
        resena.solicitudId,
      );
    }
    return this.vista(resena);
  }

  /** Promedios del maestro, recalculados desde las reseñas (fuente de verdad). */
  private async recalcular(m: EntityManager, maestroId: number): Promise<void> {
    const [r] = await m.query(
      `SELECT COUNT(*) AS total, COALESCE(AVG(calificacion), 0) AS general, COALESCE(AVG(confianza), 0) AS confianza
         FROM resenas WHERE maestroId = ?`,
      [maestroId],
    );
    const [t] = await m.query(
      `SELECT COUNT(*) AS completados FROM solicitudes WHERE maestroAsignadoId = ? AND estado = ?`,
      [maestroId, EstadoSolicitud.COMPLETADA],
    );
    await m.update(PerfilMaestro, maestroId, {
      totalResenas: Number(r.total),
      calificacionPromedio: redondear(Number(r.general)),
      confianzaPromedio: redondear(Number(r.confianza)),
      trabajosCompletados: Number(t.completados),
    });
  }

  /** Calificaciones que ve el propio maestro. */
  async delMaestro(maestroId: number) {
    const repo = this.dataSource.getRepository(Resena);
    const [promedios] = await this.dataSource.query(
      `SELECT COUNT(*) AS total, AVG(calificacion) AS general, AVG(confianza) AS confianza, AVG(calidad) AS calidad,
              AVG(puntualidad) AS puntualidad, AVG(cumplimiento) AS cumplimiento
         FROM resenas WHERE maestroId = ?`,
      [maestroId],
    );
    const lista = await repo.find({
      where: { maestroId },
      relations: { cliente: true, solicitud: { areas: true } },
      order: { creadoEn: 'DESC' },
      take: 100,
    });
    const total = Number(promedios?.total ?? 0);
    const prom = (v: unknown) => (total ? redondear(Number(v)) : null);
    return {
      resumen: {
        total,
        general: prom(promedios?.general),
        confianza: prom(promedios?.confianza),
        calidad: prom(promedios?.calidad),
        puntualidad: prom(promedios?.puntualidad),
        cumplimiento: prom(promedios?.cumplimiento),
        confianzaBaja: confianzaBaja(Number(promedios?.confianza ?? 0), total),
      },
      calificaciones: lista.map((r) => ({
        ...this.vista(r),
        codigo: r.solicitud.codigo,
        areas: (r.solicitud.areas ?? []).map((a) => a.nombre),
        // Solo el primer nombre del cliente.
        cliente: r.cliente.nombre.split(' ')[0],
      })),
    };
  }

  /** La reseña de un pedido, si existe. */
  async dePedido(solicitudId: number) {
    const r = await this.dataSource.getRepository(Resena).findOne({ where: { solicitudId } });
    return r ? this.vista(r) : null;
  }

  private vista(r: Resena) {
    return {
      calificacion: r.calificacion,
      confianza: r.confianza,
      calidad: r.calidad,
      puntualidad: r.puntualidad,
      cumplimiento: r.cumplimiento,
      comentario: r.comentario,
      creadoEn: r.creadoEn,
    };
  }
}
