import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { cifrar } from '../common/cifrado';
import { ConfiguracionIa, RegistroIa } from '../database/entities';
import { PropositoIa, ProveedorIa } from '../database/enums';
import { ActualizarConfiguracionIaDto, CrearConfiguracionIaDto, ListarModelosDto } from './dto';
import { IaService } from './ia.service';
import { clientePara, ErrorProveedorIa, ModeloIa, NOMBRES_PROVEEDOR } from './proveedores';

/** Lo que ve el superadmin de una conexión: nunca la clave completa. */
export interface ConfiguracionVisible {
  id: number;
  nombre: string;
  proveedor: ProveedorIa;
  proveedorNombre: string;
  modelo: string;
  apiKey: string;
  baseUrl: string | null;
  temperatura: number | null;
  maxTokens: number;
  proposito: PropositoIa;
  activa: boolean;
  actualizadoEn: Date;
}

@Injectable()
export class IaAdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ia: IaService,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(ConfiguracionIa);
  }

  proveedores() {
    return Object.values(ProveedorIa).map((id) => ({
      id,
      nombre: NOMBRES_PROVEEDOR[id],
      requiereBaseUrl: id === ProveedorIa.OPENAI_COMPATIBLE,
    }));
  }

  async listar(): Promise<ConfiguracionVisible[]> {
    const lista = await this.repo.find({ order: { proposito: 'ASC', activa: 'DESC', nombre: 'ASC' } });
    return lista.map((c) => this.visible(c));
  }

  async crear(dto: CrearConfiguracionIaDto, usuarioId: number): Promise<ConfiguracionVisible> {
    const baseUrl = this.validarBaseUrl(dto.proveedor, dto.baseUrl ?? null);
    const proposito = dto.proposito ?? PropositoIa.ANALISIS_SOLICITUDES;

    const id = await this.dataSource.transaction(async (m) => {
      if (dto.activa) await this.desactivarOtras(m, proposito);
      const nueva = m.create(ConfiguracionIa, {
        nombre: dto.nombre,
        proveedor: dto.proveedor,
        modelo: dto.modelo,
        apiKeyCifrada: cifrar(dto.apiKey, this.ia.llave()),
        apiKeyFinal: dto.apiKey.slice(-4),
        baseUrl,
        temperatura: dto.temperatura ?? null,
        maxTokens: dto.maxTokens ?? 1024,
        proposito,
        activa: Boolean(dto.activa),
        actualizadoPorId: usuarioId,
      });
      await m.save(nueva);
      return nueva.id;
    });
    return this.obtener(id);
  }

  async actualizar(id: number, dto: ActualizarConfiguracionIaDto, usuarioId: number): Promise<ConfiguracionVisible> {
    const actual = await this.buscar(id);
    const proveedor = dto.proveedor ?? actual.proveedor;
    const baseUrl = this.validarBaseUrl(proveedor, dto.baseUrl !== undefined ? dto.baseUrl : actual.baseUrl);
    const proposito = dto.proposito ?? actual.proposito;

    await this.dataSource.transaction(async (m) => {
      // Si cambia de propósito estando activa, no puede chocar con la activa del otro propósito.
      if (actual.activa && proposito !== actual.proposito) await this.desactivarOtras(m, proposito);
      await m.update(ConfiguracionIa, id, {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.modelo !== undefined ? { modelo: dto.modelo } : {}),
        ...(dto.temperatura !== undefined ? { temperatura: dto.temperatura } : {}),
        ...(dto.maxTokens !== undefined ? { maxTokens: dto.maxTokens } : {}),
        ...(dto.apiKey ? { apiKeyCifrada: cifrar(dto.apiKey, this.ia.llave()), apiKeyFinal: dto.apiKey.slice(-4) } : {}),
        proveedor,
        baseUrl,
        proposito,
        actualizadoPorId: usuarioId,
      });
    });
    return this.obtener(id);
  }

  /** Deja esta conexión como la única activa de su propósito. */
  async activar(id: number, usuarioId: number): Promise<ConfiguracionVisible> {
    const actual = await this.buscar(id);
    await this.dataSource.transaction(async (m) => {
      await this.desactivarOtras(m, actual.proposito);
      await m.update(ConfiguracionIa, id, { activa: true, actualizadoPorId: usuarioId });
    });
    return this.obtener(id);
  }

  async desactivar(id: number, usuarioId: number): Promise<ConfiguracionVisible> {
    await this.buscar(id);
    await this.repo.update(id, { activa: false, actualizadoPorId: usuarioId });
    return this.obtener(id);
  }

  async eliminar(id: number): Promise<void> {
    await this.buscar(id);
    await this.repo.delete(id);
  }

  /** Envía un mensaje corto al modelo para confirmar que la clave y el modelo funcionan. */
  async probar(id: number) {
    const configuracion = await this.ia.cargarConClave(id);
    if (!configuracion) throw new NotFoundException('La conexión no existe.');
    const inicio = Date.now();
    try {
      const respuesta = await this.ia.ejecutar(configuracion, configuracion.proposito, {
        sistema: 'Eres un asistente de pruebas.',
        mensaje: 'Responde solamente con la frase: ¡A la orden, veci!',
      });
      return {
        ok: true,
        respuesta: respuesta.texto.trim().slice(0, 300),
        duracionMs: Date.now() - inicio,
        tokensEntrada: respuesta.tokensEntrada ?? null,
        tokensSalida: respuesta.tokensSalida ?? null,
      };
    } catch (error) {
      return { ok: false, error: (error as Error).message, duracionMs: Date.now() - inicio };
    }
  }

  /** Consulta al proveedor qué modelos tiene disponibles esa clave. */
  async listarModelos(dto: ListarModelosDto): Promise<ModeloIa[]> {
    let apiKey = dto.apiKey ?? null;
    let baseUrl = dto.baseUrl ?? null;
    if (!apiKey && dto.configuracionId) {
      const guardada = await this.ia.cargarConClave(dto.configuracionId);
      if (!guardada) throw new NotFoundException('La conexión no existe.');
      if (guardada.proveedor !== dto.proveedor) {
        throw new BadRequestException('Para consultar otro proveedor escribe la clave de ese proveedor.');
      }
      apiKey = this.ia.conexion(guardada).apiKey;
      baseUrl = baseUrl ?? guardada.baseUrl;
    }
    if (!apiKey) throw new BadRequestException('Escribe la clave de API para consultar los modelos.');
    baseUrl = this.validarBaseUrl(dto.proveedor, baseUrl);

    try {
      return await clientePara(dto.proveedor).listarModelos({ proveedor: dto.proveedor, apiKey, baseUrl });
    } catch (error) {
      throw new BadRequestException(
        error instanceof ErrorProveedorIa ? error.message : 'No se pudieron consultar los modelos.',
      );
    }
  }

  /** Consumo de los últimos días por conexión. */
  async uso(dias = 30) {
    const desde = new Date(Date.now() - Math.min(Math.max(dias, 1), 365) * 24 * 60 * 60 * 1000);
    const filas = await this.dataSource
      .getRepository(RegistroIa)
      .createQueryBuilder('r')
      .select('r.configuracionId', 'configuracionId')
      .addSelect('r.proveedor', 'proveedor')
      .addSelect('r.modelo', 'modelo')
      .addSelect('COUNT(*)', 'llamadas')
      .addSelect('SUM(CASE WHEN r.exito = 1 THEN 0 ELSE 1 END)', 'errores')
      .addSelect('COALESCE(SUM(r.tokensEntrada), 0)', 'tokensEntrada')
      .addSelect('COALESCE(SUM(r.tokensSalida), 0)', 'tokensSalida')
      .addSelect('ROUND(AVG(r.duracionMs))', 'duracionPromedioMs')
      .where('r.creadoEn >= :desde', { desde })
      .groupBy('r.configuracionId')
      .addGroupBy('r.proveedor')
      .addGroupBy('r.modelo')
      .orderBy('llamadas', 'DESC')
      .getRawMany();
    return filas.map((f) => ({
      configuracionId: f.configuracionId === null ? null : Number(f.configuracionId),
      proveedor: f.proveedor,
      modelo: f.modelo,
      llamadas: Number(f.llamadas),
      errores: Number(f.errores),
      tokensEntrada: Number(f.tokensEntrada),
      tokensSalida: Number(f.tokensSalida),
      duracionPromedioMs: Number(f.duracionPromedioMs),
    }));
  }

  private async desactivarOtras(m: EntityManager, proposito: PropositoIa): Promise<void> {
    await m.update(ConfiguracionIa, { proposito, activa: true }, { activa: false });
  }

  private async buscar(id: number): Promise<ConfiguracionIa> {
    const encontrada = await this.repo.findOne({ where: { id } });
    if (!encontrada) throw new NotFoundException('La conexión no existe.');
    return encontrada;
  }

  private async obtener(id: number): Promise<ConfiguracionVisible> {
    return this.visible(await this.buscar(id));
  }

  /**
   * "Compatible con OpenAI" exige dirección. Las direcciones deben ser https,
   * salvo localhost para pruebas.
   */
  private validarBaseUrl(proveedor: ProveedorIa, baseUrl: string | null): string | null {
    if (!baseUrl) {
      if (proveedor === ProveedorIa.OPENAI_COMPATIBLE) {
        throw new BadRequestException('Para "Compatible con OpenAI" escribe la dirección del servicio (ej. https://openrouter.ai/api/v1).');
      }
      return null;
    }
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new BadRequestException('La dirección del servicio no es válida.');
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
      throw new BadRequestException('La dirección del servicio debe empezar por https://');
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private visible(c: ConfiguracionIa): ConfiguracionVisible {
    return {
      id: c.id,
      nombre: c.nombre,
      proveedor: c.proveedor,
      proveedorNombre: NOMBRES_PROVEEDOR[c.proveedor],
      modelo: c.modelo,
      apiKey: `••••${c.apiKeyFinal}`,
      baseUrl: c.baseUrl,
      temperatura: c.temperatura,
      maxTokens: c.maxTokens,
      proposito: c.proposito,
      activa: c.activa,
      actualizadoEn: c.actualizadoEn,
    };
  }
}
