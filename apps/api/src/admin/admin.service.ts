import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CreditosService } from '../creditos/creditos.service';
import { PerfilMaestro, Usuario } from '../database/entities';
import {
  EstadoCotizacion,
  EstadoSolicitud,
  EstadoUsuario,
  EstadoVerificacion,
  RolUsuario,
  TipoMovimientoCredito,
} from '../database/enums';
import { AjusteCreditosDto, FiltroMaestrosDto, FiltroPedidosDto } from './dto';

const n = (v: unknown) => Number(v ?? 0);
/** Las fechas se guardan en UTC; los días del tablero se cuentan en hora de Colombia. */
const DIA_CO = "DATE(CONVERT_TZ(%s, '+00:00', '-05:00'))";

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly creditos: CreditosService,
  ) {}

  private q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }

  /** Cifras del negocio para el tablero. */
  async resumen(dias = 30) {
    const desde = new Date(Date.now() - dias * 86_400_000);
    const publicadas = `s.estado <> '${EstadoSolicitud.BORRADOR}' AND s.publicadaEn >= ?`;

    const [usuarios] = await this.q(
      `SELECT
         SUM(rol = 'cliente') AS clientes,
         SUM(creadoEn >= ?) AS nuevos,
         SUM(estado = 'suspendido') AS suspendidos
       FROM usuarios`,
      [desde],
    );
    const [maestros] = await this.q(
      `SELECT
         COUNT(*) AS total,
         SUM(pm.verificacion = 'verificado') AS verificados,
         SUM(pm.verificacion = 'pendiente') AS pendientes,
         SUM(u.latitud IS NULL OR u.ubicacionAproximada = 1) AS sinUbicacionExacta,
         SUM(pm.saldoCreditos <= 0) AS sinCreditos
       FROM perfiles_maestro pm JOIN usuarios u ON u.id = pm.usuarioId
       WHERE u.estado = 'activo'`,
    );
    const porEstado = await this.q(
      `SELECT s.estado, COUNT(*) AS total FROM solicitudes s WHERE ${publicadas} GROUP BY s.estado`,
      [desde],
    );
    const [solic] = await this.q(
      `SELECT
         COUNT(*) AS publicadas,
         SUM(s.cuposUsados > 0) AS conCotizacion,
         SUM(s.estado IN ('asignada', 'completada')) AS asignadas,
         COALESCE(AVG(s.cuposUsados), 0) AS cotizacionesPromedio
       FROM solicitudes s WHERE ${publicadas}`,
      [desde],
    );
    const [primera] = await this.q(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, s.publicadaEn, x.primera)) AS minutos
         FROM solicitudes s
         JOIN (SELECT solicitudId, MIN(creadoEn) AS primera FROM cotizaciones GROUP BY solicitudId) x ON x.solicitudId = s.id
        WHERE ${publicadas}`,
      [desde],
    );
    const [cot] = await this.q(
      `SELECT COUNT(*) AS enviadas, SUM(estado = '${EstadoCotizacion.ELEGIDA}') AS elegidas
         FROM cotizaciones WHERE creadoEn >= ?`,
      [desde],
    );
    const movimientos = await this.q(
      `SELECT tipo, COALESCE(SUM(cantidad), 0) AS total FROM movimientos_credito WHERE creadoEn >= ? GROUP BY tipo`,
      [desde],
    );
    const [saldo] = await this.q(`SELECT COALESCE(SUM(saldoCreditos), 0) AS total FROM perfiles_maestro`);
    const [pagos] = await this.q(
      `SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total FROM pagos WHERE estado = 'aprobado' AND creadoEn >= ?`,
      [desde],
    );
    const [ia] = await this.q(
      `SELECT COUNT(*) AS llamadas, COALESCE(SUM(exito = 0), 0) AS errores FROM registros_ia WHERE creadoEn >= ?`,
      [desde],
    );
    const porCiudad = await this.q(
      `SELECT c.id, c.nombre,
              (SELECT COUNT(*) FROM perfiles_maestro pm JOIN usuarios u ON u.id = pm.usuarioId
                WHERE u.ciudadId = c.id AND u.estado = 'activo') AS maestros,
              (SELECT COUNT(*) FROM solicitudes s WHERE s.ciudadId = c.id AND ${publicadas}) AS pedidos
         FROM ciudades c WHERE c.activa = 1 ORDER BY c.nombre`,
      [desde],
    );

    // Serie diaria (máximo 90 días para que el gráfico se lea).
    const diasSerie = Math.min(dias, 90);
    const desdeSerie = new Date(Date.now() - (diasSerie - 1) * 86_400_000);
    const serieP = await this.q(
      `SELECT ${DIA_CO.replace('%s', 'publicadaEn')} AS dia, COUNT(*) AS total
         FROM solicitudes WHERE estado <> 'borrador' AND publicadaEn >= ? GROUP BY dia`,
      [new Date(desdeSerie.getTime() - 86_400_000)],
    );
    const serieC = await this.q(
      `SELECT ${DIA_CO.replace('%s', 'creadoEn')} AS dia, COUNT(*) AS total
         FROM cotizaciones WHERE creadoEn >= ? GROUP BY dia`,
      [new Date(desdeSerie.getTime() - 86_400_000)],
    );
    const clave = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
    const mapaP = new Map(serieP.map((f) => [clave(f.dia), n(f.total)]));
    const mapaC = new Map(serieC.map((f) => [clave(f.dia), n(f.total)]));
    const hoyCo = new Date(Date.now() - 5 * 3600 * 1000);
    const serie = Array.from({ length: diasSerie }, (_, i) => {
      const d = new Date(hoyCo.getTime() - (diasSerie - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      return { dia: d, pedidos: mapaP.get(d) ?? 0, cotizaciones: mapaC.get(d) ?? 0 };
    });

    const mov = Object.fromEntries(movimientos.map((m) => [m.tipo, n(m.total)]));
    const publicadasN = n(solic?.publicadas);
    return {
      dias,
      usuarios: {
        clientes: n(usuarios?.clientes),
        maestros: n(maestros?.total),
        nuevos: n(usuarios?.nuevos),
        suspendidos: n(usuarios?.suspendidos),
      },
      maestros: {
        activos: n(maestros?.total),
        verificados: n(maestros?.verificados),
        pendientesVerificacion: n(maestros?.pendientes),
        sinUbicacionExacta: n(maestros?.sinUbicacionExacta),
        sinCreditos: n(maestros?.sinCreditos),
      },
      pedidos: {
        publicados: publicadasN,
        conCotizacion: n(solic?.conCotizacion),
        asignados: n(solic?.asignadas),
        porcentajeConCotizacion: publicadasN ? Math.round((n(solic?.conCotizacion) / publicadasN) * 100) : null,
        porcentajeAsignados: publicadasN ? Math.round((n(solic?.asignadas) / publicadasN) * 100) : null,
        cotizacionesPromedio: Math.round(n(solic?.cotizacionesPromedio) * 10) / 10,
        minutosPrimeraCotizacion: primera?.minutos === null || primera?.minutos === undefined ? null : Math.round(n(primera.minutos)),
        porEstado: Object.fromEntries(porEstado.map((f) => [f.estado, n(f.total)])),
      },
      cotizaciones: { enviadas: n(cot?.enviadas), elegidas: n(cot?.elegidas) },
      creditos: {
        comprados: mov[TipoMovimientoCredito.COMPRA] ?? 0,
        regalados: mov[TipoMovimientoCredito.REGALO] ?? 0,
        consumidos: -(mov[TipoMovimientoCredito.COTIZACION] ?? 0),
        devueltos: mov[TipoMovimientoCredito.DEVOLUCION] ?? 0,
        ajustes: mov[TipoMovimientoCredito.AJUSTE] ?? 0,
        saldoEnCirculacion: n(saldo?.total),
      },
      ingresos: { pagos: n(pagos?.cantidad), total: n(pagos?.total) },
      ia: { llamadas: n(ia?.llamadas), errores: n(ia?.errores) },
      porCiudad: porCiudad.map((c) => ({ id: n(c.id), nombre: c.nombre, maestros: n(c.maestros), pedidos: n(c.pedidos) })),
      serie,
    };
  }

  async maestros(f: FiltroMaestrosDto) {
    const params: unknown[] = [];
    const condiciones: string[] = [];
    if (f.buscar) {
      condiciones.push('(u.nombre LIKE ? OR u.celular LIKE ? OR u.correo LIKE ?)');
      const t = `%${f.buscar.replace(/[%_]/g, '')}%`;
      params.push(t, t, t);
    }
    if (f.ciudadId) {
      condiciones.push('u.ciudadId = ?');
      params.push(f.ciudadId);
    }
    if (f.verificacion) {
      condiciones.push('pm.verificacion = ?');
      params.push(f.verificacion);
    }
    const filas = await this.q(
      `SELECT u.id, u.nombre, u.celular, u.correo, u.estado, u.creadoEn, u.ubicacionAproximada,
              c.nombre AS ciudad, COALESCE(b.nombre, u.barrioTexto) AS barrio,
              pm.verificacion, pm.saldoCreditos, pm.radioKm, pm.recibeAvisos, pm.aniosExperiencia,
              pm.calificacionPromedio, pm.totalResenas,
              (SELECT GROUP_CONCAT(a.nombre ORDER BY a.id SEPARATOR ', ')
                 FROM maestro_areas ma JOIN areas a ON a.id = ma.areaId WHERE ma.maestroId = u.id) AS oficios,
              (SELECT COUNT(*) FROM cotizaciones co WHERE co.maestroId = u.id) AS cotizaciones,
              (SELECT COUNT(*) FROM cotizaciones co WHERE co.maestroId = u.id AND co.estado = 'elegida') AS elegidas
         FROM perfiles_maestro pm
         JOIN usuarios u ON u.id = pm.usuarioId
         LEFT JOIN ciudades c ON c.id = u.ciudadId
         LEFT JOIN barrios b ON b.id = u.barrioId
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY (pm.verificacion = 'pendiente') DESC, u.creadoEn DESC
        LIMIT 200`,
      params,
    );
    return filas.map((r) => ({
      id: n(r.id),
      nombre: r.nombre,
      celular: r.celular,
      correo: r.correo,
      estado: r.estado,
      ciudad: r.ciudad,
      barrio: r.barrio,
      ubicacionAproximada: Boolean(r.ubicacionAproximada),
      oficios: r.oficios ?? '',
      verificacion: r.verificacion,
      saldoCreditos: n(r.saldoCreditos),
      radioKm: n(r.radioKm),
      recibeAvisos: Boolean(r.recibeAvisos),
      aniosExperiencia: n(r.aniosExperiencia),
      calificacion: n(r.calificacionPromedio),
      totalResenas: n(r.totalResenas),
      cotizaciones: n(r.cotizaciones),
      elegidas: n(r.elegidas),
      creadoEn: r.creadoEn,
    }));
  }

  async pedidos(f: FiltroPedidosDto) {
    const params: unknown[] = [];
    const condiciones = [`s.estado <> 'borrador'`];
    if (f.estado) {
      condiciones.push('s.estado = ?');
      params.push(f.estado);
    }
    if (f.ciudadId) {
      condiciones.push('s.ciudadId = ?');
      params.push(f.ciudadId);
    }
    const filas = await this.q(
      `SELECT s.id, s.codigo, s.estado, s.resumen, s.descripcion, s.urgente, s.cuposUsados, s.cuposMax,
              s.creditosPorCotizacion, s.publicadaEn, s.canal,
              c.nombre AS ciudad, COALESCE(b.nombre, s.barrioTexto) AS barrio,
              cli.nombre AS cliente, cli.celular AS clienteCelular, ma.nombre AS maestroAsignado,
              (SELECT GROUP_CONCAT(a.nombre ORDER BY a.id SEPARATOR ', ')
                 FROM solicitud_areas sa JOIN areas a ON a.id = sa.areaId WHERE sa.solicitudId = s.id) AS oficios,
              (SELECT COUNT(*) FROM notificaciones_solicitud ns WHERE ns.solicitudId = s.id) AS avisados
         FROM solicitudes s
         JOIN usuarios cli ON cli.id = s.clienteId
         LEFT JOIN usuarios ma ON ma.id = s.maestroAsignadoId
         LEFT JOIN ciudades c ON c.id = s.ciudadId
         LEFT JOIN barrios b ON b.id = s.barrioId
        WHERE ${condiciones.join(' AND ')}
        ORDER BY s.publicadaEn DESC, s.id DESC
        LIMIT 200`,
      params,
    );
    return filas.map((r) => ({
      codigo: r.codigo,
      estado: r.estado,
      resumen: r.resumen ?? String(r.descripcion).slice(0, 160),
      oficios: r.oficios ?? '',
      urgente: Boolean(r.urgente),
      ciudad: r.ciudad,
      barrio: r.barrio,
      cliente: r.cliente,
      clienteCelular: r.clienteCelular,
      maestroAsignado: r.maestroAsignado,
      avisados: n(r.avisados),
      cotizaciones: n(r.cuposUsados),
      cuposMax: n(r.cuposMax),
      creditosPorCotizacion: n(r.creditosPorCotizacion),
      canal: r.canal,
      publicadaEn: r.publicadaEn,
    }));
  }

  async cambiarVerificacion(maestroId: number, verificacion: EstadoVerificacion) {
    const resultado = await this.dataSource.getRepository(PerfilMaestro).update({ usuarioId: maestroId }, { verificacion });
    if (!resultado.affected) throw new NotFoundException('El maestro no existe.');
    return { id: maestroId, verificacion };
  }

  async cambiarEstado(adminId: number, usuarioId: number, estado: EstadoUsuario) {
    if (adminId === usuarioId) throw new BadRequestException('No puedes suspender tu propia cuenta.');
    const usuarios = this.dataSource.getRepository(Usuario);
    const usuario = await usuarios.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('La cuenta no existe.');
    if (usuario.rol === RolUsuario.SUPERADMIN) throw new ForbiddenException('No se puede suspender a un superadministrador.');
    await usuarios.update(usuarioId, { estado });
    return { id: usuarioId, estado };
  }

  async ajustarCreditos(adminId: number, maestroId: number, dto: AjusteCreditosDto) {
    const perfil = await this.dataSource.getRepository(PerfilMaestro).findOne({ where: { usuarioId: maestroId } });
    if (!perfil) throw new NotFoundException('El maestro no existe.');
    if (perfil.saldoCreditos + dto.cantidad < 0) {
      throw new BadRequestException(
        `El maestro tiene ${perfil.saldoCreditos} créditos; el ajuste lo dejaría en negativo.`,
      );
    }
    const movimiento = await this.creditos.registrar({
      maestroId,
      tipo: TipoMovimientoCredito.AJUSTE,
      cantidad: dto.cantidad,
      referenciaTipo: 'ajuste_admin',
      referenciaId: randomUUID(),
      descripcion: `Ajuste del administrador (#${adminId}): ${dto.motivo}`.slice(0, 255),
    });
    return { id: maestroId, saldoCreditos: movimiento.saldoResultante };
  }
}
