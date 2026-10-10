import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { descifrar, llaveDesdeHex } from '../common/cifrado';
import { ConfiguracionIa, RegistroIa } from '../database/entities';
import { PropositoIa } from '../database/enums';
import { clientePara, ConexionIa, ErrorProveedorIa, extraerJson, PeticionIa, RespuestaIa } from './proveedores';

/**
 * Punto único para usar IA en la plataforma. No sabe qué proveedor hay detrás:
 * usa la conexión que el superadmin dejó activa para cada propósito.
 */
@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /** Envía una petición al modelo activo del propósito (o al de uso general si no hay uno específico). */
  async completar(proposito: PropositoIa, peticion: PeticionIa): Promise<RespuestaIa> {
    const configuracion = await this.configuracionActiva(proposito);
    if (!configuracion) {
      throw new ServiceUnavailableException(
        'No hay un modelo de IA activo. El superadministrador debe configurarlo en Administración › IA.',
      );
    }
    return this.ejecutar(configuracion, proposito, peticion);
  }

  /** Igual que completar, pero pide y devuelve JSON ya interpretado. */
  async completarJson<T>(proposito: PropositoIa, peticion: Omit<PeticionIa, 'json'>): Promise<T> {
    const respuesta = await this.completar(proposito, { ...peticion, json: true });
    return extraerJson<T>(respuesta.texto);
  }

  /** Ejecuta con una conexión concreta y deja registro del consumo. Lo usa también "Probar conexión". */
  async ejecutar(
    configuracion: ConfiguracionIa,
    proposito: PropositoIa,
    peticion: PeticionIa,
  ): Promise<RespuestaIa> {
    const conexion = this.conexion(configuracion);
    const inicio = Date.now();
    try {
      const respuesta = await clientePara(conexion.proveedor).completar(conexion, peticion);
      await this.registrar(configuracion, proposito, Date.now() - inicio, true, null, respuesta);
      return respuesta;
    } catch (error) {
      const mensaje =
        error instanceof ErrorProveedorIa ? error.message : 'Error inesperado al llamar al modelo de IA.';
      if (!(error instanceof ErrorProveedorIa)) this.logger.error(mensaje, error as Error);
      await this.registrar(configuracion, proposito, Date.now() - inicio, false, mensaje);
      throw error instanceof ErrorProveedorIa ? new ServiceUnavailableException(mensaje) : error;
    }
  }

  /** Descifra la clave guardada y arma los datos de conexión. */
  conexion(configuracion: ConfiguracionIa & { apiKeyCifrada?: string }): ConexionIa {
    if (!configuracion.apiKeyCifrada) throw new Error('La conexión se cargó sin su clave cifrada.');
    return {
      proveedor: configuracion.proveedor,
      modelo: configuracion.modelo,
      apiKey: descifrar(configuracion.apiKeyCifrada, this.llave()),
      baseUrl: configuracion.baseUrl,
      temperatura: configuracion.temperatura,
      maxTokens: configuracion.maxTokens,
    };
  }

  llave(): Buffer {
    return llaveDesdeHex(this.config.get<string>('CONFIG_ENCRYPTION_KEY'));
  }

  /** Carga una conexión incluyendo su clave cifrada (que normalmente no se selecciona). */
  async cargarConClave(id: number): Promise<ConfiguracionIa | null> {
    return this.dataSource
      .getRepository(ConfiguracionIa)
      .createQueryBuilder('c')
      .addSelect('c.apiKeyCifrada')
      .where('c.id = :id', { id })
      .getOne();
  }

  private async configuracionActiva(proposito: PropositoIa): Promise<ConfiguracionIa | null> {
    const consulta = (p: PropositoIa) =>
      this.dataSource
        .getRepository(ConfiguracionIa)
        .createQueryBuilder('c')
        .addSelect('c.apiKeyCifrada')
        .where('c.proposito = :p AND c.activa = 1', { p })
        .orderBy('c.actualizadoEn', 'DESC')
        .getOne();
    return (await consulta(proposito)) ?? (proposito !== PropositoIa.GENERAL ? consulta(PropositoIa.GENERAL) : null);
  }

  private async registrar(
    configuracion: ConfiguracionIa,
    proposito: PropositoIa,
    duracionMs: number,
    exito: boolean,
    error: string | null,
    respuesta?: RespuestaIa,
  ): Promise<void> {
    try {
      await this.dataSource.getRepository(RegistroIa).insert({
        configuracionId: configuracion.id,
        proveedor: configuracion.proveedor,
        modelo: configuracion.modelo,
        proposito,
        duracionMs,
        exito,
        error: error?.slice(0, 500) ?? null,
        tokensEntrada: respuesta?.tokensEntrada ?? null,
        tokensSalida: respuesta?.tokensSalida ?? null,
      });
    } catch (e) {
      this.logger.warn(`No se pudo guardar el registro de uso de IA: ${(e as Error).message}`);
    }
  }
}
