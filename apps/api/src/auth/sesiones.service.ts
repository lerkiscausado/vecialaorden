import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { DataSource, IsNull, LessThan } from 'typeorm';
import { Sesion as SesionRenovacion, Usuario } from '../database/entities';
import { EstadoUsuario } from '../database/enums';

export interface DatosCliente {
  agente?: string;
  ip?: string;
}

/**
 * Si dos pestañas renuevan casi al tiempo, la segunda llega con el token que la
 * primera acaba de reemplazar. Dentro de este margen no se toma como robo.
 */
const MARGEN_CARRERA_MS = 20_000;

export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

@Injectable()
export class SesionesService {
  private readonly logger = new Logger(SesionesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  get diasVigencia(): number {
    return Math.max(1, Number(this.config.get('REFRESH_TTL_DAYS', 30)) || 30);
  }

  /** Crea un token de renovación y devuelve su valor (solo se conoce aquí). */
  async emitir(usuarioId: number, cliente: DatosCliente = {}, familia?: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.dataSource.getRepository(SesionRenovacion).insert({
      usuarioId,
      familia: familia ?? randomBytes(16).toString('hex'),
      tokenHash: hashToken(token),
      expiraEn: new Date(Date.now() + this.diasVigencia * 86_400_000),
      agente: cliente.agente?.slice(0, 255) ?? null,
      ip: cliente.ip?.slice(0, 45) ?? null,
    });
    // Limpieza ocasional de sesiones vencidas hace más de una semana.
    if (Math.random() < 0.02) {
      await this.dataSource
        .getRepository(SesionRenovacion)
        .delete({ expiraEn: LessThan(new Date(Date.now() - 7 * 86_400_000)) })
        .catch(() => undefined);
    }
    return token;
  }

  /**
   * Cambia un token de renovación por uno nuevo (rotación).
   * Devuelve el usuario y el nuevo token.
   */
  async renovar(token: string | undefined, cliente: DatosCliente = {}): Promise<{ usuarioId: number; token: string }> {
    const invalida = new UnauthorizedException('Tu sesión expiró. Vuelve a iniciar sesión.');
    if (!token) throw invalida;

    const resultado = await this.dataSource.transaction(async (m) => {
      const s = await m.findOne(SesionRenovacion, {
        where: { tokenHash: hashToken(token) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!s || s.revocadaEn || s.expiraEn.getTime() < Date.now()) return null;

      if (s.reemplazadaEn) {
        if (Date.now() - s.reemplazadaEn.getTime() <= MARGEN_CARRERA_MS) return 'carrera' as const;
        // Reutilizaron un token viejo: alguien más lo tiene. Se cierra esa sesión en todos lados.
        await m.update(SesionRenovacion, { familia: s.familia, revocadaEn: IsNull() }, { revocadaEn: new Date() });
        this.logger.warn(`Token de renovación reutilizado (usuario ${s.usuarioId}); se revocó la sesión.`);
        return null;
      }

      const usuario = await m.findOne(Usuario, { where: { id: s.usuarioId }, select: { id: true, estado: true } });
      if (!usuario) return null;
      if (usuario.estado !== EstadoUsuario.ACTIVO) {
        await m.update(SesionRenovacion, { usuarioId: s.usuarioId, revocadaEn: IsNull() }, { revocadaEn: new Date() });
        return 'suspendido' as const;
      }

      await m.update(SesionRenovacion, s.id, { reemplazadaEn: new Date() });
      return { usuarioId: s.usuarioId, familia: s.familia };
    });

    if (resultado === 'carrera') {
      // La otra pestaña ya renovó: el navegador tiene la cookie nueva; basta con reintentar.
      throw new UnauthorizedException({ message: 'Reintenta la renovación.', codigo: 'reintentar' });
    }
    if (resultado === 'suspendido') throw new ForbiddenException('Tu cuenta está suspendida. Escríbenos para revisarla.');
    if (!resultado) throw invalida;

    return { usuarioId: resultado.usuarioId, token: await this.emitir(resultado.usuarioId, cliente, resultado.familia) };
  }

  /** Cierra la sesión de este dispositivo (toda la familia del token). */
  async cerrar(token: string | undefined): Promise<void> {
    if (!token) return;
    const s = await this.dataSource.getRepository(SesionRenovacion).findOne({ where: { tokenHash: hashToken(token) } });
    if (!s) return;
    await this.dataSource
      .getRepository(SesionRenovacion)
      .update({ familia: s.familia, revocadaEn: IsNull() }, { revocadaEn: new Date() });
  }

  /** Cierra todas las sesiones de un usuario (por ejemplo, al suspenderlo). */
  async cerrarTodas(usuarioId: number): Promise<void> {
    await this.dataSource
      .getRepository(SesionRenovacion)
      .update({ usuarioId, revocadaEn: IsNull() }, { revocadaEn: new Date() });
  }
}
