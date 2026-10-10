import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificacionSolicitud, Solicitud } from '../database/entities';
import { CanalNotificacion } from '../database/enums';
import { MaestroCercano } from '../ubicacion/ubicacion.service';

/**
 * Avisa a los maestros que hay un trabajo nuevo cerca.
 * Por ahora deja el registro y lo muestra en la consola; el envío real
 * por correo (Resend) y WhatsApp se conecta cuando estén las cuentas.
 */
@Injectable()
export class NotificadorService {
  private readonly logger = new Logger(NotificadorService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async avisarNuevaSolicitud(solicitud: Solicitud, maestros: MaestroCercano[]): Promise<void> {
    if (!maestros.length) return;
    const ahora = new Date();
    const filas = maestros.map((m) => ({
      solicitudId: solicitud.id,
      maestroId: m.maestroId,
      canal: m.correo ? CanalNotificacion.CORREO : CanalNotificacion.WHATSAPP,
      distanciaKm: m.distanciaKm,
      enviadaEn: ahora,
    }));
    await this.dataSource.createQueryBuilder().insert().into(NotificacionSolicitud).values(filas).orIgnore().execute();

    for (const m of maestros) {
      this.logger.log(
        `[modo desarrollo] Aviso a ${m.nombre} (${m.correo ?? m.celular}, ${m.distanciaKm} km): ` +
          `trabajo #${solicitud.codigo} — ${solicitud.resumen ?? solicitud.descripcion.slice(0, 80)}`,
      );
    }
  }
}
