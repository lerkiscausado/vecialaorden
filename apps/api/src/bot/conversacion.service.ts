import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { normalizarCelular } from '../common/telefono';
import { Area, Conversacion, MensajeWhatsapp, Solicitud, Usuario } from '../database/entities';
import {
  CanalSolicitud,
  DireccionMensaje,
  EstadoConversacion,
  EstadoSolicitud,
  PropositoIa,
  RolUsuario,
} from '../database/enums';
import { IaService } from '../ia/ia.service';
import { SolicitudesService } from '../solicitudes/solicitudes.service';
import { Punto, UbicacionService } from '../ubicacion/ubicacion.service';
import { AnalisisPedido, AreaCatalogo, instruccionesAnalisis, mensajeCorreccion, validarAnalisis } from './analisis';
import { esCancelar, esNuevo, esSaludo, esSi, esSinUbicacion, MSG, resumenPedido } from './textos';

export interface MensajeEntrante {
  celular: string;
  /** Nombre del perfil de WhatsApp, si lo envía. */
  nombrePerfil?: string | null;
  texto?: string | null;
  ubicacion?: Punto | null;
  /** Id del mensaje en WhatsApp, para no procesarlo dos veces. */
  waMessageId?: string | null;
  canal: CanalSolicitud;
}

export interface ResultadoConversacion {
  respuestas: string[];
  estado: EstadoConversacion;
  solicitudId: number | null;
  duplicado: boolean;
}

const HORAS_INACTIVIDAD = 24;
const ESTADOS_EN_CURSO = [
  EstadoConversacion.ESPERANDO_CIUDAD,
  EstadoConversacion.ESPERANDO_UBICACION,
  EstadoConversacion.ESPERANDO_CONFIRMACION,
];

/**
 * Cerebro del bot. No sabe por dónde llegan los mensajes (WhatsApp o el
 * simulador): recibe un mensaje, actualiza la conversación y devuelve las
 * respuestas que el canal debe enviar.
 */
@Injectable()
export class ConversacionService {
  private readonly logger = new Logger(ConversacionService.name);
  /** Los mensajes de un mismo celular se procesan uno a la vez. */
  private readonly colas = new Map<string, Promise<unknown>>();
  private catalogo: { areas: AreaCatalogo[]; hasta: number } | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ia: IaService,
    private readonly solicitudes: SolicitudesService,
    private readonly ubicacion: UbicacionService,
    private readonly config: ConfigService,
  ) {}

  procesar(entrada: MensajeEntrante): Promise<ResultadoConversacion> {
    const celular = normalizarCelular(entrada.celular);
    if (!celular) throw new BadRequestException('El número de celular no es válido.');
    const anterior = this.colas.get(celular) ?? Promise.resolve();
    const actual = anterior.catch(() => undefined).then(() => this.procesarEnOrden({ ...entrada, celular }));
    this.colas.set(celular, actual);
    actual.finally(() => {
      if (this.colas.get(celular) === actual) this.colas.delete(celular);
    }).catch(() => undefined);
    return actual;
  }

  private async procesarEnOrden(e: MensajeEntrante): Promise<ResultadoConversacion> {
    const mensajes = this.dataSource.getRepository(MensajeWhatsapp);
    if (e.waMessageId && (await mensajes.exists({ where: { waMessageId: e.waMessageId } }))) {
      const conv = await this.dataSource.getRepository(Conversacion).findOne({ where: { celular: e.celular } });
      return { respuestas: [], estado: conv?.estado ?? EstadoConversacion.INICIO, solicitudId: conv?.solicitudId ?? null, duplicado: true };
    }

    const entrante = await mensajes.save(
      mensajes.create({
        waMessageId: e.waMessageId ?? null,
        celular: e.celular,
        direccion: DireccionMensaje.ENTRANTE,
        tipo: e.ubicacion ? 'location' : 'text',
        texto: e.texto?.slice(0, 5000) ?? null,
        contenido: { canal: e.canal, ...(e.ubicacion ? { ubicacion: e.ubicacion } : {}) },
      }),
    );

    const { usuario, nuevo } = await this.usuarioPara(e.celular, e.nombrePerfil);
    const convs = this.dataSource.getRepository(Conversacion);
    let conv = await convs.findOne({ where: { celular: e.celular } });
    if (!conv) conv = convs.create({ celular: e.celular, usuarioId: usuario.id, estado: EstadoConversacion.INICIO });

    const respuestas: string[] = [];
    if (nuevo) respuestas.push(MSG.bienvenida(this.urlPrivacidad()));

    // Si dejó un pedido a medias hace mucho, se empieza de nuevo.
    const inactiva =
      conv.ultimoMensajeEn && Date.now() - conv.ultimoMensajeEn.getTime() > HORAS_INACTIVIDAD * 3600 * 1000;
    if (inactiva && ESTADOS_EN_CURSO.includes(conv.estado)) await this.reiniciar(conv);

    try {
      await this.paso(conv, usuario, e, respuestas, nuevo);
    } catch (error) {
      this.logger.error(`Error procesando mensaje de ${e.celular}`, error as Error);
      respuestas.push(MSG.errorIa);
    }

    conv.ultimoMensajeEn = new Date();
    await convs.save(conv);

    const solicitudId = conv.solicitudId;
    await mensajes.update(entrante.id, { procesadoEn: new Date(), solicitudId });
    if (respuestas.length) {
      await mensajes.insert(
        respuestas.map((texto) => ({
          celular: e.celular,
          direccion: DireccionMensaje.SALIENTE,
          tipo: 'text',
          texto,
          solicitudId,
          contenido: { canal: e.canal },
          procesadoEn: new Date(),
        })),
      );
    }
    return { respuestas, estado: conv.estado, solicitudId, duplicado: false };
  }

  private async paso(
    conv: Conversacion,
    usuario: Usuario,
    e: MensajeEntrante,
    r: string[],
    nuevo: boolean,
  ): Promise<void> {
    const texto = e.texto?.trim() ?? '';
    let solicitud = conv.solicitudId ? await this.solicitudes.cargar(conv.solicitudId) : null;

    if (texto && esCancelar(texto)) {
      if (!solicitud || conv.estado === EstadoConversacion.INICIO) {
        r.push(MSG.nadaQueCancelar);
      } else if (await this.solicitudes.cancelar(solicitud)) {
        await this.reiniciar(conv, false);
        r.push(MSG.cancelada);
      } else {
        r.push(MSG.noSePuedeCancelar(solicitud.codigo));
      }
      return;
    }

    if (conv.estado === EstadoConversacion.PUBLICADA) {
      const activa = solicitud && [EstadoSolicitud.ABIERTA, EstadoSolicitud.CUPOS_LLENOS].includes(solicitud.estado);
      if (texto && esNuevo(texto)) {
        await this.reiniciar(conv, false);
        r.push(MSG.pedirDescripcion);
        return;
      }
      if (activa && solicitud) {
        r.push(MSG.yaPublicada(solicitud.codigo, solicitud.cuposUsados, this.urlWeb(`/pedidos/${solicitud.codigo}`)));
        return;
      }
      // La anterior ya terminó: este mensaje empieza un pedido nuevo.
      await this.reiniciar(conv, false);
      solicitud = null;
    }

    // Esperaba datos de un borrador que ya no existe (o que se canceló por otro medio).
    if (conv.estado !== EstadoConversacion.INICIO && solicitud?.estado !== EstadoSolicitud.BORRADOR) {
      await this.reiniciar(conv, false);
    }

    switch (conv.estado) {
      case EstadoConversacion.INICIO:
        return this.inicio(conv, usuario, e, texto, r, nuevo);
      case EstadoConversacion.ESPERANDO_CIUDAD:
        return this.esperandoCiudad(conv, solicitud!, e, texto, r);
      case EstadoConversacion.ESPERANDO_UBICACION:
        return this.esperandoUbicacion(conv, solicitud!, e, texto, r);
      case EstadoConversacion.ESPERANDO_CONFIRMACION:
        return this.esperandoConfirmacion(conv, solicitud!, e, texto, r);
    }
  }

  private async inicio(conv: Conversacion, usuario: Usuario, e: MensajeEntrante, texto: string, r: string[], nuevo: boolean) {
    if (!texto) {
      if (!nuevo) r.push(e.ubicacion ? MSG.pedirDescripcion : MSG.sinTexto);
      return;
    }
    if (esSaludo(texto)) {
      if (!nuevo) r.push(MSG.pedirDescripcion);
      return;
    }

    const analisis = await this.analizar(texto);
    if (!analisis) return void r.push(MSG.errorIa);
    if (!analisis.esSolicitud) return void r.push(MSG.noEsSolicitud);

    const solicitud = await this.solicitudes.crearBorrador(usuario.id, texto, analisis, e.canal);
    conv.solicitudId = solicitud.id;
    conv.contexto = {};
    await this.resolverLugar(solicitud, analisis, usuario);
    if (e.ubicacion) await this.aplicarUbicacion(solicitud, e.ubicacion, r);
    await this.siguientePaso(conv, solicitud, r);
  }

  private async esperandoCiudad(conv: Conversacion, solicitud: Solicitud, e: MensajeEntrante, texto: string, r: string[]) {
    if (e.ubicacion) {
      if (await this.aplicarUbicacion(solicitud, e.ubicacion, r)) await this.siguientePaso(conv, solicitud, r);
      return;
    }
    const activas = await this.ciudadesActivasTexto();
    const ciudad = await this.ubicacion.resolverCiudad(texto);
    if (!ciudad) return void r.push(MSG.ciudadNoReconocida(activas));
    if (!ciudad.activa) return void r.push(MSG.ciudadNoDisponible(ciudad.nombre, activas));

    solicitud.ciudadId = ciudad.id;
    // A veces escriben ciudad y barrio juntos: "Cartagena, Manga".
    const barrio = await this.ubicacion.buscarBarrio(ciudad.id, texto);
    if (barrio) this.ponerBarrio(solicitud, barrio);
    await this.siguientePaso(conv, solicitud, r);
  }

  private async esperandoUbicacion(conv: Conversacion, solicitud: Solicitud, e: MensajeEntrante, texto: string, r: string[]) {
    if (e.ubicacion) {
      if (await this.aplicarUbicacion(solicitud, e.ubicacion, r)) await this.siguientePaso(conv, solicitud, r);
      return;
    }
    if (!texto) return void r.push(MSG.pedirUbicacion);

    const ciudad = await this.ubicacion.ciudad(solicitud.ciudadId!);
    if (!ciudad) return this.siguientePaso(conv, solicitud, r);

    const barrio = esSinUbicacion(texto) ? null : await this.ubicacion.buscarBarrio(ciudad.id, texto);
    if (barrio) {
      this.ponerBarrio(solicitud, barrio);
    } else if (esSinUbicacion(texto) || conv.contexto?.intentosUbicacion) {
      // Sin ubicación exacta ni barrio conocido: se usa el centro de la ciudad.
      if (!esSinUbicacion(texto)) solicitud.barrioTexto = texto.slice(0, 160);
      solicitud.latitud = ciudad.latitud;
      solicitud.longitud = ciudad.longitud;
      solicitud.ubicacionAproximada = true;
    } else {
      solicitud.barrioTexto = texto.slice(0, 160);
      conv.contexto = { ...(conv.contexto ?? {}), intentosUbicacion: 1 };
      await this.solicitudes.guardar(solicitud);
      return void r.push(MSG.barrioNoEncontrado(ciudad.nombre));
    }
    await this.siguientePaso(conv, solicitud, r);
  }

  private async esperandoConfirmacion(conv: Conversacion, solicitud: Solicitud, e: MensajeEntrante, texto: string, r: string[]) {
    if (e.ubicacion) {
      if (await this.aplicarUbicacion(solicitud, e.ubicacion, r)) await this.siguientePaso(conv, solicitud, r);
      return;
    }
    if (!texto) return void r.push(MSG.sinTexto);

    if (esSi(texto)) {
      const avisados = await this.solicitudes.publicar(solicitud);
      conv.estado = EstadoConversacion.PUBLICADA;
      conv.contexto = null;
      r.push(
        avisados
          ? MSG.publicada(solicitud.codigo, avisados, this.urlWeb(`/pedidos/${solicitud.codigo}`))
          : MSG.publicadaSinMaestros(solicitud.codigo, (solicitud.areas ?? []).map((a) => a.nombre.toLowerCase()).join(' o ')),
      );
      return;
    }

    // Cualquier otro texto es una corrección del pedido.
    const ciudadActual = solicitud.ciudadId ? await this.ubicacion.ciudad(solicitud.ciudadId) : null;
    const antes = this.solicitudes.analisisDe(solicitud, ciudadActual?.nombre ?? null);
    const analisis = await this.analizar(mensajeCorreccion(antes, texto));
    if (!analisis) return void r.push(MSG.errorIa);
    if (analisis.areas.length) await this.solicitudes.aplicarAnalisis(solicitud, analisis);
    const cambioLugar =
      (analisis.ciudad ?? null) !== (antes.ciudad ?? null) || (analisis.barrio ?? null) !== (antes.barrio ?? null);
    if (cambioLugar) await this.resolverLugar(solicitud, analisis, null, true);
    await this.siguientePaso(conv, solicitud, r);
  }

  /** Decide qué falta y pregunta; si no falta nada, muestra el resumen para confirmar. */
  private async siguientePaso(conv: Conversacion, solicitud: Solicitud, r: string[]) {
    const ciudad = solicitud.ciudadId ? await this.ubicacion.ciudad(solicitud.ciudadId) : null;
    const activas = await this.ciudadesActivasTexto();

    if (!ciudad || !ciudad.activa) {
      conv.estado = EstadoConversacion.ESPERANDO_CIUDAD;
      if (ciudad) solicitud.ciudadId = null;
      await this.solicitudes.guardar(solicitud);
      r.push(ciudad ? MSG.ciudadNoDisponible(ciudad.nombre, activas) : MSG.pedirCiudad(activas));
      return;
    }

    if (solicitud.latitud === null || solicitud.longitud === null) {
      conv.estado = EstadoConversacion.ESPERANDO_UBICACION;
      await this.solicitudes.guardar(solicitud);
      if (solicitud.barrioTexto && !conv.contexto?.intentosUbicacion) {
        conv.contexto = { ...(conv.contexto ?? {}), intentosUbicacion: 1 };
        r.push(MSG.barrioNoEncontrado(ciudad.nombre));
      } else {
        r.push(MSG.pedirUbicacion);
      }
      return;
    }

    conv.estado = EstadoConversacion.ESPERANDO_CONFIRMACION;
    await this.solicitudes.guardar(solicitud);
    const barrio = solicitud.barrioId
      ? (await this.solicitudes.cargar(solicitud.id))?.barrio?.nombre ?? solicitud.barrioTexto
      : solicitud.barrioTexto;
    r.push(
      resumenPedido({
        areas: (solicitud.areas ?? []).map((a) => a.nombre),
        resumen: solicitud.resumen,
        barrio,
        ciudad: ciudad.nombre,
        ubicacionExacta: !solicitud.ubicacionAproximada,
        medidas: solicitud.medidas,
        urgente: solicitud.urgente,
      }),
    );
  }

  /** Ciudad y barrio a partir de lo que dijo el cliente (o de su perfil). */
  private async resolverLugar(solicitud: Solicitud, analisis: AnalisisPedido, usuario: Usuario | null, cambio = false) {
    const ciudad =
      (await this.ubicacion.resolverCiudad(analisis.ciudad)) ??
      (await this.ubicacion.resolverCiudad(analisis.barrio)) ??
      (!cambio && usuario?.ciudadId ? await this.ubicacion.ciudad(usuario.ciudadId) : null);

    if (cambio && ciudad && ciudad.id !== solicitud.ciudadId) {
      // Cambió de ciudad: la ubicación anterior ya no sirve.
      solicitud.latitud = null;
      solicitud.longitud = null;
      solicitud.barrioId = null;
      solicitud.barrioTexto = null;
    }
    if (ciudad) solicitud.ciudadId = ciudad.id;
    if (!analisis.barrio || (cambio && !solicitud.ubicacionAproximada && solicitud.latitud !== null)) return;

    const barrio = ciudad?.activa ? await this.ubicacion.buscarBarrio(ciudad.id, analisis.barrio) : null;
    if (barrio) {
      this.ponerBarrio(solicitud, barrio);
    } else {
      solicitud.barrioId = null;
      solicitud.barrioTexto = analisis.barrio;
      if (cambio) {
        solicitud.latitud = null;
        solicitud.longitud = null;
      }
    }
  }

  private ponerBarrio(solicitud: Solicitud, barrio: { id: number; nombre: string; latitud: number; longitud: number }) {
    solicitud.barrioId = barrio.id;
    solicitud.barrioTexto = barrio.nombre;
    // Si ya tenía ubicación exacta, el barrio no la reemplaza.
    if (solicitud.latitud === null || solicitud.ubicacionAproximada) {
      solicitud.latitud = barrio.latitud;
      solicitud.longitud = barrio.longitud;
      solicitud.ubicacionAproximada = true;
    }
  }

  /** Ubicación compartida por WhatsApp: fija el punto exacto y la ciudad más cercana. */
  private async aplicarUbicacion(solicitud: Solicitud, punto: Punto, r: string[]): Promise<boolean> {
    const activas = await this.ciudadesActivasTexto();
    const cerca = await this.ubicacion.ciudadCercana(punto);
    if (!cerca) {
      r.push(`Esa ubicación no está en una ciudad donde funcionemos todavía. Por ahora atendemos en ${activas}.`);
      return false;
    }
    if (!cerca.ciudad.activa) {
      r.push(MSG.ciudadNoDisponible(cerca.ciudad.nombre, activas));
      return false;
    }
    solicitud.ciudadId = cerca.ciudad.id;
    solicitud.latitud = Number(punto.latitud.toFixed(6));
    solicitud.longitud = Number(punto.longitud.toFixed(6));
    solicitud.ubicacionAproximada = false;
    return true;
  }

  private async analizar(mensaje: string): Promise<AnalisisPedido | null> {
    const areas = await this.areas();
    try {
      const crudo = await this.ia.completarJson<unknown>(PropositoIa.ANALISIS_SOLICITUDES, {
        sistema: instruccionesAnalisis(areas),
        mensaje,
      });
      return validarAnalisis(crudo, areas.map((a) => a.slug));
    } catch (error) {
      this.logger.warn(`La IA no pudo analizar el pedido: ${(error as Error).message}`);
      return null;
    }
  }

  private async areas(): Promise<AreaCatalogo[]> {
    if (this.catalogo && this.catalogo.hasta > Date.now()) return this.catalogo.areas;
    const areas = await this.dataSource.getRepository(Area).find({ where: { activa: true }, order: { id: 'ASC' } });
    this.catalogo = { areas: areas.map(({ slug, nombre }) => ({ slug, nombre })), hasta: Date.now() + 5 * 60_000 };
    return this.catalogo.areas;
  }

  private async ciudadesActivasTexto(): Promise<string> {
    const nombres = (await this.ubicacion.ciudadesActivas()).map((c) => `*${c.nombre}*`);
    if (nombres.length <= 1) return nombres[0] ?? '';
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  }

  /** Cuenta del cliente: la crea en su primer mensaje (el celular ya viene verificado por WhatsApp). */
  private async usuarioPara(celular: string, nombrePerfil?: string | null): Promise<{ usuario: Usuario; nuevo: boolean }> {
    const usuarios = this.dataSource.getRepository(Usuario);
    const existente = await usuarios.findOne({ where: { celular } });
    if (existente) {
      if (!existente.aceptoDatosEn) await usuarios.update(existente.id, { aceptoDatosEn: new Date() });
      return { usuario: existente, nuevo: false };
    }
    const nombre = nombrePerfil?.trim().slice(0, 120) || 'Veci';
    const usuario = await usuarios.save(
      usuarios.create({
        nombre,
        celular,
        rol: RolUsuario.CLIENTE,
        celularVerificado: true,
        aceptoDatosEn: new Date(),
      }),
    );
    return { usuario, nuevo: true };
  }

  /** Vuelve la conversación al inicio; si había un borrador a medias, lo cancela. */
  private async reiniciar(conv: Conversacion, cancelarBorrador = true) {
    if (cancelarBorrador && conv.solicitudId) {
      const borrador = await this.solicitudes.cargar(conv.solicitudId);
      if (borrador?.estado === EstadoSolicitud.BORRADOR) await this.solicitudes.cancelar(borrador);
    }
    conv.estado = EstadoConversacion.INICIO;
    conv.solicitudId = null;
    conv.contexto = null;
  }

  private urlPrivacidad(): string {
    return this.urlWeb('/privacidad');
  }

  private urlWeb(ruta: string): string {
    const base = (this.config.get<string>('WEB_PUBLIC_URL') ?? this.config.get<string>('WEB_ORIGIN') ?? '')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    return `${base || 'https://vecialaorden.com'}${ruta}`;
  }
}
