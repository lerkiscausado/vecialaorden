import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Not } from 'typeorm';
import { CreditosService } from '../creditos/creditos.service';
import {
  Cotizacion,
  NotificacionSolicitud,
  PerfilMaestro,
  Solicitud,
  Usuario,
} from '../database/entities';
import { EstadoCotizacion, EstadoSolicitud, EstadoVerificacion, TipoMovimientoCredito } from '../database/enums';
import { MensajeriaService } from '../mensajeria/mensajeria.service';
import { CotizarDto } from './dto';
import { EtiquetaPrecio, rankear } from './ranking';

const DIAS_VISIBLES = 14;
const pesos = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`;

/** Fecha de hoy en Colombia (UTC-5), formato AAAA-MM-DD. */
function hoyEnColombia(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function minutosEntre(desde: Date | null, hasta: Date): number {
  if (!desde) return 0;
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / 60_000));
}

/** Por qué un maestro ya no puede cotizar un trabajo (null si sí puede). */
function motivoNoCotizable(s: Solicitud, yaCotizo: boolean): string | null {
  if (yaCotizo) return 'Ya enviaste tu cotización.';
  if (s.estado === EstadoSolicitud.CUPOS_LLENOS) return `Ya se llenaron los ${s.cuposMax} cupos.`;
  if (s.estado === EstadoSolicitud.ASIGNADA || s.estado === EstadoSolicitud.COMPLETADA) return 'El cliente ya eligió un maestro.';
  if (s.estado === EstadoSolicitud.CANCELADA) return 'El cliente canceló el pedido.';
  if (s.estado !== EstadoSolicitud.ABIERTA) return 'Este pedido ya no recibe cotizaciones.';
  if (s.expiraEn && s.expiraEn.getTime() < Date.now()) return 'El pedido ya venció.';
  return null;
}

function ubicacionTexto(s: Solicitud): string | null {
  return [s.barrio?.nombre ?? s.barrioTexto, s.ciudad?.nombre].filter(Boolean).join(', ') || null;
}

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly creditos: CreditosService,
    private readonly mensajeria: MensajeriaService,
  ) {}

  // ───────────────────────── Maestro ─────────────────────────

  /** Trabajos de los que se le avisó al maestro en los últimos días. */
  async trabajosDisponibles(maestroId: number) {
    const avisos = await this.dataSource.getRepository(NotificacionSolicitud).find({
      where: { maestroId, creadoEn: MoreThan(new Date(Date.now() - DIAS_VISIBLES * 86_400_000)) },
      relations: { solicitud: { areas: true, barrio: true, ciudad: true } },
      order: { creadoEn: 'DESC' },
      take: 100,
    });
    const unicos = [...new Map(avisos.map((a) => [a.solicitudId, a])).values()];
    const mias = unicos.length
      ? await this.dataSource.getRepository(Cotizacion).find({
          where: { maestroId, solicitudId: In(unicos.map((a) => a.solicitudId)) },
        })
      : [];
    const miaPor = new Map(mias.map((c) => [c.solicitudId, c]));

    return unicos.map(({ solicitud: s, distanciaKm }) => {
      const mia = miaPor.get(s.id);
      const motivo = motivoNoCotizable(s, Boolean(mia));
      return {
        codigo: s.codigo,
        resumen: s.resumen ?? s.descripcion.slice(0, 200),
        areas: (s.areas ?? []).map((a) => a.nombre),
        ubicacion: ubicacionTexto(s),
        distanciaKm,
        medidas: s.medidas,
        tamano: s.tamano,
        urgente: s.urgente,
        creditos: s.creditosPorCotizacion,
        cuposUsados: s.cuposUsados,
        cuposMax: s.cuposMax,
        publicadaEn: s.publicadaEn,
        expiraEn: s.expiraEn,
        puedeCotizar: motivo === null,
        motivo,
        miCotizacion: mia ? { precioTotal: mia.precioTotal, estado: mia.estado } : null,
      };
    });
  }

  async cotizar(maestroId: number, codigo: string, dto: CotizarDto) {
    if (dto.fechaDisponible && dto.fechaDisponible < hoyEnColombia()) {
      throw new BadRequestException('La fecha en que puedes empezar no puede ser anterior a hoy.');
    }
    const materiales = dto.materiales ?? 0;

    const resultado = await this.dataSource.transaction(async (m) => {
      // Bloquea el pedido: así dos maestros no pueden tomar el último cupo al mismo tiempo.
      const s = await m.findOne(Solicitud, { where: { codigo }, lock: { mode: 'pessimistic_write' } });
      if (!s) throw new NotFoundException('El trabajo no existe.');
      if (s.clienteId === maestroId) throw new BadRequestException('No puedes cotizar tu propio pedido.');

      const avisado = await m.exists(NotificacionSolicitud, { where: { solicitudId: s.id, maestroId } });
      if (!avisado) throw new ForbiddenException('Este trabajo no está en tu zona ni en tus oficios.');

      const yaCotizo = await m.exists(Cotizacion, { where: { solicitudId: s.id, maestroId } });
      if (yaCotizo) throw new ConflictException('Ya enviaste una cotización para este trabajo.');
      const motivo = motivoNoCotizable(s, false);
      if (motivo) throw new BadRequestException(motivo);
      if (s.cuposUsados >= s.cuposMax) throw new BadRequestException(`Ya se llenaron los ${s.cuposMax} cupos.`);

      const perfil = await m.findOne(PerfilMaestro, { where: { usuarioId: maestroId }, lock: { mode: 'pessimistic_write' } });
      if (!perfil) throw new ForbiddenException('Tu cuenta no tiene perfil de maestro.');
      if (perfil.saldoCreditos < s.creditosPorCotizacion) {
        throw new BadRequestException(
          `No tienes créditos suficientes: este trabajo cuesta ${s.creditosPorCotizacion} y tienes ${perfil.saldoCreditos}. Compra más en la pestaña Créditos.`,
        );
      }

      const cotizacion = m.create(Cotizacion, {
        solicitudId: s.id,
        maestroId,
        manoDeObra: dto.manoDeObra,
        materiales,
        precioTotal: dto.manoDeObra + materiales,
        mensaje: dto.mensaje ?? null,
        fechaDisponible: dto.fechaDisponible ?? null,
        duracionDias: dto.duracionDias ?? null,
        creditosCobrados: s.creditosPorCotizacion,
      });
      await m.save(cotizacion);

      const movimiento = await this.creditos.registrar(
        {
          maestroId,
          tipo: TipoMovimientoCredito.COTIZACION,
          cantidad: -s.creditosPorCotizacion,
          referenciaTipo: 'cotizacion',
          referenciaId: cotizacion.id,
          descripcion: `Cotización del trabajo #${s.codigo}`,
        },
        m,
      );

      const cuposUsados = s.cuposUsados + 1;
      const llenos = cuposUsados >= s.cuposMax;
      await m.update(Solicitud, s.id, {
        cuposUsados,
        ...(llenos ? { estado: EstadoSolicitud.CUPOS_LLENOS } : {}),
      });
      return { s, cotizacion, cuposUsados, llenos, saldo: movimiento.saldoResultante };
    });

    await this.avisarClienteNuevaCotizacion(resultado.s, resultado.cotizacion, maestroId, resultado.cuposUsados, resultado.llenos);
    return {
      codigo,
      precioTotal: resultado.cotizacion.precioTotal,
      creditosCobrados: resultado.cotizacion.creditosCobrados,
      saldoCreditos: resultado.saldo,
      numero: resultado.cuposUsados,
    };
  }

  /** Historial del maestro, con un resumen fácil de leer arriba. */
  async historial(maestroId: number, estado?: EstadoCotizacion | 'todas') {
    const repo = this.dataSource.getRepository(Cotizacion);
    const filtro = estado && estado !== 'todas' ? { estado } : {};
    const lista = await repo.find({
      where: { maestroId, ...filtro },
      relations: { solicitud: { areas: true, barrio: true, ciudad: true, cliente: true } },
      order: { creadoEn: 'DESC' },
      take: 200,
    });

    const totales = await repo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'enviadas')
      .addSelect(`SUM(c.estado = '${EstadoCotizacion.ELEGIDA}')`, 'elegidas')
      .addSelect(`SUM(c.estado = '${EstadoCotizacion.DESCARTADA}')`, 'noElegidas')
      .addSelect(`SUM(c.estado = '${EstadoCotizacion.ENVIADA}')`, 'enEspera')
      .addSelect('COALESCE(SUM(c.creditosCobrados), 0)', 'creditosGastados')
      .addSelect(`COALESCE(SUM(CASE WHEN c.estado = '${EstadoCotizacion.ELEGIDA}' THEN c.precioTotal ELSE 0 END), 0)`, 'valorGanado')
      .where('c.maestroId = :maestroId', { maestroId })
      .getRawOne();
    const perfil = await this.dataSource.getRepository(PerfilMaestro).findOne({ where: { usuarioId: maestroId } });

    const n = (v: unknown) => Number(v ?? 0);
    const elegidas = n(totales?.elegidas);
    const noElegidas = n(totales?.noElegidas);
    return {
      resumen: {
        enviadas: n(totales?.enviadas),
        elegidas,
        noElegidas,
        enEspera: n(totales?.enEspera),
        tasaExito: elegidas + noElegidas ? Math.round((elegidas / (elegidas + noElegidas)) * 100) : null,
        creditosGastados: n(totales?.creditosGastados),
        valorGanado: n(totales?.valorGanado),
        saldoCreditos: perfil?.saldoCreditos ?? 0,
      },
      cotizaciones: lista.map((c) => ({
        id: c.id,
        codigo: c.solicitud.codigo,
        resumen: c.solicitud.resumen ?? c.solicitud.descripcion.slice(0, 200),
        areas: (c.solicitud.areas ?? []).map((a) => a.nombre),
        ubicacion: ubicacionTexto(c.solicitud),
        precioTotal: c.precioTotal,
        manoDeObra: c.manoDeObra,
        materiales: c.materiales,
        creditosCobrados: c.creditosCobrados,
        estado: c.estado,
        enviadaEn: c.creadoEn,
        // El contacto del cliente solo se revela al maestro elegido.
        cliente:
          c.estado === EstadoCotizacion.ELEGIDA
            ? { nombre: c.solicitud.cliente.nombre, celular: c.solicitud.cliente.celular }
            : null,
      })),
    };
  }

  // ───────────────────────── Cliente ─────────────────────────

  async misPedidos(clienteId: number) {
    const pedidos = await this.dataSource.getRepository(Solicitud).find({
      where: { clienteId, estado: Not(EstadoSolicitud.BORRADOR) },
      relations: { areas: true, barrio: true, ciudad: true },
      order: { creadoEn: 'DESC' },
      take: 50,
    });
    return pedidos.map((s) => ({
      codigo: s.codigo,
      resumen: s.resumen ?? s.descripcion.slice(0, 200),
      areas: (s.areas ?? []).map((a) => a.nombre),
      ubicacion: ubicacionTexto(s),
      estado: s.estado,
      cotizaciones: s.cuposUsados,
      cuposMax: s.cuposMax,
      publicadaEn: s.publicadaEn,
    }));
  }

  async detallePedido(clienteId: number, codigo: string) {
    const s = await this.dataSource.getRepository(Solicitud).findOne({
      where: { codigo, clienteId },
      relations: { areas: true, barrio: true, ciudad: true },
    });
    if (!s || s.estado === EstadoSolicitud.BORRADOR) throw new NotFoundException('No encontramos ese pedido en tu cuenta.');

    const cotizaciones = await this.dataSource.getRepository(Cotizacion).find({
      where: { solicitudId: s.id, estado: Not(EstadoCotizacion.RETIRADA) },
      relations: { maestro: { perfilMaestro: true } },
    });
    const avisos = await this.dataSource.getRepository(NotificacionSolicitud).find({ where: { solicitudId: s.id } });
    const distancia = new Map(avisos.map((a) => [a.maestroId, a.distanciaKm]));
    const porId = new Map(cotizaciones.map((c) => [c.id, c]));

    const referencia = s.precioRefMin && s.precioRefMax ? { min: s.precioRefMin, max: s.precioRefMax } : null;
    const ordenadas = rankear(
      cotizaciones.map((c) => ({
        cotizacionId: c.id,
        precioTotal: c.precioTotal,
        minutosRespuesta: minutosEntre(s.publicadaEn, c.creadoEn),
        distanciaKm: distancia.get(c.maestroId) ?? null,
        calificacion: c.maestro.perfilMaestro?.calificacionPromedio ?? 0,
        totalResenas: c.maestro.perfilMaestro?.totalResenas ?? 0,
        trabajosCompletados: c.maestro.perfilMaestro?.trabajosCompletados ?? 0,
        aniosExperiencia: c.maestro.perfilMaestro?.aniosExperiencia ?? 0,
      })),
      referencia,
    );

    return {
      codigo: s.codigo,
      resumen: s.resumen ?? s.descripcion.slice(0, 200),
      descripcion: s.descripcion,
      areas: (s.areas ?? []).map((a) => a.nombre),
      ubicacion: ubicacionTexto(s),
      estado: s.estado,
      cuposUsados: s.cuposUsados,
      cuposMax: s.cuposMax,
      publicadaEn: s.publicadaEn,
      expiraEn: s.expiraEn,
      puedeElegir: s.estado === EstadoSolicitud.ABIERTA || s.estado === EstadoSolicitud.CUPOS_LLENOS,
      cotizaciones: ordenadas.map((r, i) => {
        const c = porId.get(r.cotizacionId)!;
        const p = c.maestro.perfilMaestro;
        return {
          id: c.id,
          posicion: i + 1,
          puntaje: r.puntaje,
          etiquetaPrecio: r.etiquetaPrecio as EtiquetaPrecio,
          precioTotal: c.precioTotal,
          manoDeObra: c.manoDeObra,
          materiales: c.materiales,
          mensaje: c.mensaje,
          fechaDisponible: c.fechaDisponible,
          duracionDias: c.duracionDias,
          minutosRespuesta: r.minutosRespuesta,
          distanciaKm: r.distanciaKm,
          estado: c.estado,
          maestro: {
            nombre: c.maestro.nombre,
            verificado: p?.verificacion === EstadoVerificacion.VERIFICADO,
            calificacion: p?.calificacionPromedio ?? 0,
            totalResenas: p?.totalResenas ?? 0,
            trabajosCompletados: p?.trabajosCompletados ?? 0,
            aniosExperiencia: p?.aniosExperiencia ?? 0,
            // El celular se muestra solo después de elegir.
            celular: c.estado === EstadoCotizacion.ELEGIDA ? c.maestro.celular : null,
          },
        };
      }),
    };
  }

  async elegir(clienteId: number, codigo: string, cotizacionId: number) {
    const { s, elegida, otras } = await this.dataSource.transaction(async (m) => {
      const s = await m.findOne(Solicitud, { where: { codigo, clienteId }, lock: { mode: 'pessimistic_write' } });
      if (!s) throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
      if (s.estado !== EstadoSolicitud.ABIERTA && s.estado !== EstadoSolicitud.CUPOS_LLENOS) {
        throw new BadRequestException(
          s.estado === EstadoSolicitud.ASIGNADA ? 'Ya elegiste un maestro para este pedido.' : 'Este pedido ya no está activo.',
        );
      }
      const elegida = await m.findOne(Cotizacion, {
        where: { id: cotizacionId, solicitudId: s.id, estado: EstadoCotizacion.ENVIADA },
        relations: { maestro: true },
      });
      if (!elegida) throw new BadRequestException('Esa cotización no está disponible.');

      const otras = await m.find(Cotizacion, {
        where: { solicitudId: s.id, estado: EstadoCotizacion.ENVIADA, id: Not(cotizacionId) },
        relations: { maestro: true },
      });
      await m.update(Cotizacion, elegida.id, { estado: EstadoCotizacion.ELEGIDA });
      if (otras.length) await m.update(Cotizacion, { id: In(otras.map((o) => o.id)) }, { estado: EstadoCotizacion.DESCARTADA });
      await m.update(Solicitud, s.id, { estado: EstadoSolicitud.ASIGNADA, maestroAsignadoId: elegida.maestroId });
      return { s, elegida, otras };
    });

    const cliente = await this.dataSource.getRepository(Usuario).findOneOrFail({ where: { id: clienteId } });
    const completo = await this.dataSource.getRepository(Solicitud).findOne({
      where: { id: s.id },
      relations: { barrio: true, ciudad: true },
    });
    const lugar = completo ? ubicacionTexto(completo) : null;

    await this.mensajeria.enviarTexto(
      elegida.maestro.celular,
      `🎉 ¡Te eligieron, ${elegida.maestro.nombre.split(' ')[0]}! El cliente aceptó tu cotización de *${pesos(elegida.precioTotal)}* para el trabajo *#${s.codigo}*.\n\n` +
        `👤 ${cliente.nombre}\n📞 ${cliente.celular}${lugar ? `\n📍 ${lugar}` : ''}\n\nEscríbele para coordinar la visita.`,
      s.id,
    );
    for (const otra of otras) {
      await this.mensajeria.enviarTexto(
        otra.maestro.celular,
        `El cliente del trabajo *#${s.codigo}* eligió otra cotización. ¡Gracias por participar! Te seguiremos avisando de trabajos cerca de ti.`,
        s.id,
      );
    }
    await this.mensajeria.enviarTexto(
      cliente.celular,
      `✅ Elegiste a *${elegida.maestro.nombre}* para tu pedido *#${s.codigo}*.\n📞 ${elegida.maestro.celular}\n\nYa le avisamos y te escribirá para coordinar. ¡Gracias por usar Veci a la Orden!`,
      s.id,
    );
    return this.detallePedido(clienteId, codigo);
  }

  private async avisarClienteNuevaCotizacion(
    s: Solicitud,
    c: Cotizacion,
    maestroId: number,
    numero: number,
    llenos: boolean,
  ): Promise<void> {
    const [cliente, maestro] = await Promise.all([
      this.dataSource.getRepository(Usuario).findOne({ where: { id: s.clienteId } }),
      this.dataSource.getRepository(Usuario).findOne({ where: { id: maestroId } }),
    ]);
    if (!cliente) return;
    const enlace = this.mensajeria.urlWeb(`/pedidos/${s.codigo}`);
    const texto =
      `📩 Te llegó la cotización *${numero} de ${s.cuposMax}* para tu pedido *#${s.codigo}*: ` +
      `*${pesos(c.precioTotal)}* de ${maestro?.nombre ?? 'un maestro'}.\n\n` +
      (llenos ? `Ya tienes todas las cotizaciones. ` : '') +
      `Compáralas y elige aquí: ${enlace}`;
    await this.mensajeria.enviarTexto(cliente.celular, texto, s.id);
  }
}
