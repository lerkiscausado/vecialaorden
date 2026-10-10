import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { MovimientoCredito, PerfilMaestro } from '../database/entities';
import { TipoMovimientoCredito } from '../database/enums';

export interface DatosMovimiento {
  maestroId: number;
  tipo: TipoMovimientoCredito;
  /** Positivo suma, negativo descuenta. */
  cantidad: number;
  referenciaTipo?: string;
  referenciaId?: string | number;
  descripcion?: string;
}

/**
 * Libro de créditos de los maestros. Todo cambio de saldo pasa por aquí:
 * se bloquea la fila del maestro, se escribe el movimiento y se actualiza
 * el saldo en la misma transacción.
 */
@Injectable()
export class CreditosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Registra un movimiento. Si ya existe uno con el mismo tipo y referencia
   * (por ejemplo, el mismo pago avisado dos veces), devuelve el existente
   * sin volver a sumar.
   */
  async registrar(datos: DatosMovimiento, manager?: EntityManager): Promise<MovimientoCredito> {
    if (!Number.isInteger(datos.cantidad) || datos.cantidad === 0) {
      throw new BadRequestException('La cantidad de créditos debe ser un entero distinto de cero.');
    }
    if (manager) return this.registrarEn(manager, datos);
    return this.dataSource.transaction((m) => this.registrarEn(m, datos));
  }

  private async registrarEn(manager: EntityManager, datos: DatosMovimiento): Promise<MovimientoCredito> {
    const referenciaId = datos.referenciaId === undefined ? null : String(datos.referenciaId);
    const referenciaTipo = datos.referenciaTipo ?? null;

    if (referenciaTipo && referenciaId) {
      const existente = await manager.findOne(MovimientoCredito, {
        where: { tipo: datos.tipo, referenciaTipo, referenciaId },
      });
      if (existente) return existente;
    }

    const perfil = await manager.findOne(PerfilMaestro, {
      where: { usuarioId: datos.maestroId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!perfil) throw new NotFoundException('El maestro no existe.');

    const saldoResultante = perfil.saldoCreditos + datos.cantidad;
    if (saldoResultante < 0) {
      throw new BadRequestException('No tienes créditos suficientes.');
    }

    const movimiento = manager.create(MovimientoCredito, {
      maestroId: datos.maestroId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      saldoResultante,
      referenciaTipo,
      referenciaId,
      descripcion: datos.descripcion ?? null,
    });
    await manager.save(movimiento);
    await manager.update(PerfilMaestro, { usuarioId: datos.maestroId }, { saldoCreditos: saldoResultante });
    return movimiento;
  }

  async historial(maestroId: number, limite = 50): Promise<MovimientoCredito[]> {
    return this.dataSource.getRepository(MovimientoCredito).find({
      where: { maestroId },
      order: { creadoEn: 'DESC', id: 'DESC' },
      take: Math.min(limite, 200),
    });
  }
}
