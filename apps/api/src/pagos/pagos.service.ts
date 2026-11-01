import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { CreditosService } from '../creditos/creditos.service';
import { Pago, PaqueteCredito, PerfilMaestro, Usuario } from '../database/entities';
import { EstadoPago, TipoMovimientoCredito } from '../database/enums';
import { MensajeriaService } from '../mensajeria/mensajeria.service';
import {
  ConfigWompi,
  estadoDesdeWompi,
  esPrueba,
  EventoWompi,
  eventoValido,
  TransaccionWompi,
  urlApi,
  urlCheckout,
} from './wompi';

/** Pagos que siguen pendientes después de esto ya no se muestran como "en proceso". */
const HORAS_PENDIENTE_VISIBLE = 24;

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly creditos: CreditosService,
    private readonly mensajeria: MensajeriaService,
    private readonly config: ConfigService,
  ) {}

  private wompi(): ConfigWompi | null {
    const llavePublica = this.config.get<string>('WOMPI_PUBLIC_KEY')?.trim();
    const secretoIntegridad = this.config.get<string>('WOMPI_INTEGRITY_SECRET')?.trim();
    const secretoEventos = this.config.get<string>('WOMPI_EVENTS_SECRET')?.trim();
    if (!llavePublica || !secretoIntegridad || !secretoEventos) return null;
    return { llavePublica, secretoIntegridad, secretoEventos };
  }

  /** Crea el pago pendiente y devuelve la dirección del checkout de Wompi. */
  async crear(maestroId: number, paqueteId: number) {
    const cfg = this.wompi();
    if (!cfg) throw new ServiceUnavailableException('La compra en línea todavía no está activa. Escríbenos para comprar créditos.');

    const [paquete, usuario, perfil] = await Promise.all([
      this.dataSource.getRepository(PaqueteCredito).findOne({ where: { id: paqueteId, activo: true } }),
      this.dataSource.getRepository(Usuario).findOne({ where: { id: maestroId } }),
      this.dataSource.getRepository(PerfilMaestro).findOne({ where: { usuarioId: maestroId } }),
    ]);
    if (!paquete) throw new NotFoundException('Ese paquete ya no está disponible.');
    if (!usuario || !perfil) throw new NotFoundException('Tu perfil de maestro no existe.');

    const referencia = `VAO-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const pago = await this.dataSource.getRepository(Pago).save(
      this.dataSource.getRepository(Pago).create({
        maestroId,
        paqueteId: paquete.id,
        referencia,
        monto: paquete.precio,
        creditos: paquete.creditos,
        estado: EstadoPago.PENDIENTE,
      }),
    );

    return {
      referencia: pago.referencia,
      modoPrueba: esPrueba(cfg.llavePublica),
      urlCheckout: urlCheckout(cfg, {
        referencia,
        montoEnCentavos: paquete.precio * 100,
        urlRegreso: this.mensajeria.urlWeb(`/pagos/resultado?ref=${referencia}`),
        correo: usuario.correo,
        nombre: usuario.nombre,
        celular: usuario.celular,
      }),
    };
  }

  /** Aviso de Wompi (webhook). Devuelve false si la firma no es válida. */
  async recibirEvento(evento: EventoWompi, checksumCabecera?: string): Promise<boolean> {
    const cfg = this.wompi();
    if (!cfg) {
      this.logger.warn('Llegó un evento de Wompi pero los pagos no están configurados.');
      return false;
    }
    if (!eventoValido(evento, cfg.secretoEventos, checksumCabecera)) {
      this.logger.warn('Evento de Wompi con firma inválida: se ignora.');
      return false;
    }
    const tx = evento.data?.transaction;
    if (evento.event !== 'transaction.updated' || !tx?.reference) return true;
    await this.aplicar(tx, evento as unknown as Record<string, unknown>);
    return true;
  }

  /**
   * Al volver del checkout: si el pago sigue pendiente, se consulta la transacción
   * directamente en Wompi (por si el aviso todavía no ha llegado).
   */
  async confirmar(maestroId: number, referencia: string, transaccionId?: string) {
    const pago = await this.dataSource.getRepository(Pago).findOne({ where: { referencia, maestroId } });
    if (!pago) throw new NotFoundException('No encontramos ese pago en tu cuenta.');

    const cfg = this.wompi();
    if (cfg && pago.estado === EstadoPago.PENDIENTE && transaccionId) {
      const tx = await this.consultarWompi(cfg, transaccionId);
      if (tx && tx.reference === referencia) await this.aplicar(tx, { origen: 'consulta', transaction: tx });
    }
    return this.vista((await this.dataSource.getRepository(Pago).findOne({ where: { id: pago.id }, relations: { paquete: true } }))!);
  }

  async misPagos(maestroId: number) {
    const lista = await this.dataSource.getRepository(Pago).find({
      where: { maestroId },
      relations: { paquete: true },
      order: { creadoEn: 'DESC' },
      take: 50,
    });
    const limite = Date.now() - HORAS_PENDIENTE_VISIBLE * 3_600_000;
    const cfg = this.wompi();
    return {
      disponible: !!cfg,
      modoPrueba: cfg ? esPrueba(cfg.llavePublica) : false,
      // Los pendientes viejos son checkouts abandonados: no se muestran.
      pagos: lista.filter((p) => p.estado !== EstadoPago.PENDIENTE || p.creadoEn.getTime() > limite).map((p) => this.vista(p)),
    };
  }

  private async consultarWompi(cfg: ConfigWompi, transaccionId: string): Promise<TransaccionWompi | null> {
    if (!/^[\w-]{4,64}$/.test(transaccionId)) throw new BadRequestException('Transacción inválida.');
    try {
      const r = await fetch(`${urlApi(cfg.llavePublica)}/transactions/${encodeURIComponent(transaccionId)}`, {
        headers: { Authorization: `Bearer ${cfg.llavePublica}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) {
        this.logger.warn(`Wompi respondió ${r.status} al consultar la transacción ${transaccionId}.`);
        return null;
      }
      const cuerpo = (await r.json()) as { data?: TransaccionWompi };
      return cuerpo.data ?? null;
    } catch (err) {
      this.logger.warn(`No se pudo consultar Wompi: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Aplica el estado de una transacción a su pago. Idempotente: un pago aprobado
   * no cambia más, y los créditos se suman una sola vez (índice único del libro).
   */
  private async aplicar(tx: TransaccionWompi, datos: Record<string, unknown>): Promise<void> {
    const nuevo = estadoDesdeWompi(tx.status);
    const acreditado = await this.dataSource.transaction(async (m) => {
      const pago = await m.findOne(Pago, {
        where: { referencia: tx.reference },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago) {
        this.logger.warn(`Transacción ${tx.id} con referencia desconocida ${tx.reference}.`);
        return null;
      }
      if (pago.estado === EstadoPago.APROBADO) return null;
      if (nuevo === EstadoPago.PENDIENTE && pago.estado === EstadoPago.PENDIENTE) return null;

      const montoOk = Number(tx.amount_in_cents) === pago.monto * 100 && (tx.currency ?? 'COP') === 'COP';
      const estado = nuevo === EstadoPago.APROBADO && !montoOk ? EstadoPago.ERROR : nuevo;
      if (!montoOk && nuevo === EstadoPago.APROBADO) {
        this.logger.error(
          `Pago ${pago.referencia}: Wompi aprobó ${tx.amount_in_cents} centavos ${tx.currency}, se esperaban ${pago.monto * 100} COP. No se acreditan créditos.`,
        );
      }

      await m.update(Pago, pago.id, {
        estado,
        transaccionId: tx.id,
        metodo: tx.payment_method_type ?? pago.metodo,
        datosPasarela: datos as never,
      });
      if (estado !== EstadoPago.APROBADO) return null;

      const paquete = pago.paqueteId ? await m.findOne(PaqueteCredito, { where: { id: pago.paqueteId } }) : null;
      await this.creditos.registrar(
        {
          maestroId: pago.maestroId,
          tipo: TipoMovimientoCredito.COMPRA,
          cantidad: pago.creditos,
          referenciaTipo: 'pago',
          referenciaId: pago.id,
          descripcion: paquete ? `Compra paquete ${paquete.nombre}` : 'Compra de créditos',
        },
        m,
      );
      return pago;
    });

    if (acreditado) {
      const usuario = await this.dataSource.getRepository(Usuario).findOne({ where: { id: acreditado.maestroId } });
      const perfil = await this.dataSource.getRepository(PerfilMaestro).findOne({ where: { usuarioId: acreditado.maestroId } });
      if (usuario) {
        await this.mensajeria.enviarTexto(
          usuario.celular,
          `✅ ¡Pago aprobado! Se sumaron *${acreditado.creditos} créditos* a tu cuenta. ` +
            `Ahora tienes *${perfil?.saldoCreditos ?? acreditado.creditos}*.\n\n` +
            `Mira los trabajos disponibles: ${this.mensajeria.urlWeb('/panel')}`,
        );
      }
    }
  }

  private vista(p: Pago) {
    return {
      referencia: p.referencia,
      paquete: p.paquete?.nombre ?? null,
      monto: p.monto,
      creditos: p.creditos,
      estado: p.estado,
      metodo: p.metodo,
      creadoEn: p.creadoEn,
    };
  }
}
