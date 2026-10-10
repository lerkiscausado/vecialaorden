import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In } from 'typeorm';
import { normalizarCelular } from '../common/telefono';
import { CreditosService } from '../creditos/creditos.service';
import { Area, PerfilMaestro, Usuario } from '../database/entities';
import { EstadoUsuario, PropositoOtp, RolUsuario, TipoMovimientoCredito } from '../database/enums';
import { UbicacionService } from '../ubicacion/ubicacion.service';
import { LoginDto, RegistroDto } from './dto';
import { OtpService } from './otp.service';

const RONDAS_BCRYPT = 12;

export interface Sesion {
  token: string;
  usuario: PerfilPublico;
}

export interface PerfilPublico {
  id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  rol: RolUsuario;
  celularVerificado: boolean;
  barrio: string | null;
  ciudad: { id: number; nombre: string } | null;
  ubicacionAproximada: boolean;
  maestro: {
    aniosExperiencia: number;
    verificacion: string;
    saldoCreditos: number;
    calificacionPromedio: number;
    radioKm: number;
    recibeAvisos: boolean;
    areas: { slug: string; nombre: string }[];
  } | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly creditos: CreditosService,
    private readonly config: ConfigService,
    private readonly ubicacion: UbicacionService,
  ) {}

  /**
   * Crea la cuenta y envía un código por WhatsApp para verificar el celular.
   * La sesión se entrega al verificar el código.
   */
  async registrar(dto: RegistroDto): Promise<{ celular: string }> {
    const celular = this.celularValido(dto.celular);
    const usuarios = this.dataSource.getRepository(Usuario);

    const existente = await usuarios.findOne({ where: { celular } });
    if (existente?.celularVerificado) {
      throw new ConflictException('Ya existe una cuenta con ese celular. Inicia sesión.');
    }
    if (dto.correo) {
      const conCorreo = await usuarios.findOne({ where: { correo: dto.correo } });
      if (conCorreo && conCorreo.id !== existente?.id) {
        throw new ConflictException('Ya existe una cuenta con ese correo.');
      }
    }

    let areas: Area[] = [];
    if (dto.rol === RolUsuario.MAESTRO) {
      const slugs = [...new Set(dto.areas ?? [])];
      areas = await this.dataSource.getRepository(Area).find({ where: { slug: In(slugs), activa: true } });
      if (areas.length !== slugs.length) throw new BadRequestException('Alguno de los oficios no es válido.');
    }

    // Ciudad y punto inicial: el barrio si lo reconocemos, si no el centro de la ciudad.
    // El maestro puede fijar después su ubicación exacta en "Mi zona de trabajo".
    let ubicacion: { ciudadId: number; barrioId: number | null; latitud: number; longitud: number } | null = null;
    if (dto.ciudadId !== undefined) {
      const ciudad = await this.ubicacion.ciudad(dto.ciudadId);
      if (!ciudad?.activa) throw new BadRequestException('Por ahora solo funcionamos en Bogotá y Cartagena.');
      const barrio = await this.ubicacion.buscarBarrio(ciudad.id, dto.barrio);
      const punto = barrio ?? ciudad;
      ubicacion = { ciudadId: ciudad.id, barrioId: barrio?.id ?? null, latitud: punto.latitud, longitud: punto.longitud };
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, RONDAS_BCRYPT) : null;

    await this.dataSource.transaction(async (m) => {
      // Si quedó un registro sin verificar con ese celular, se reemplaza con los datos nuevos.
      const usuario = m.create(Usuario, {
        ...(existente ? { id: existente.id } : {}),
        nombre: dto.nombre,
        celular,
        correo: dto.correo ?? null,
        passwordHash,
        rol: dto.rol,
        barrioTexto: dto.barrio ?? null,
        ...(ubicacion ? { ...ubicacion, ubicacionAproximada: true } : {}),
        aceptoDatosEn: new Date(),
        celularVerificado: false,
      });
      await m.save(usuario);

      if (dto.rol === RolUsuario.MAESTRO) {
        const perfil = m.create(PerfilMaestro, {
          usuarioId: usuario.id,
          aniosExperiencia: dto.aniosExperiencia ?? 0,
          areas,
        });
        await m.save(perfil);
      } else if (existente) {
        await m.delete(PerfilMaestro, { usuarioId: usuario.id });
      }
    });

    await this.otp.enviar(celular, PropositoOtp.VERIFICAR_CELULAR);
    return { celular };
  }

  /** Envía un código para entrar. Responde igual exista o no la cuenta. */
  async solicitarCodigo(celularTexto: string): Promise<{ celular: string }> {
    const celular = this.celularValido(celularTexto);
    const usuario = await this.dataSource.getRepository(Usuario).findOne({ where: { celular } });
    if (usuario && usuario.estado === EstadoUsuario.ACTIVO) {
      await this.otp.enviar(celular, PropositoOtp.LOGIN);
    }
    return { celular };
  }

  /** Verifica el código; marca el celular como verificado y entrega la sesión. */
  async verificarCodigo(celularTexto: string, codigo: string): Promise<Sesion> {
    const celular = this.celularValido(celularTexto);
    await this.otp.verificar(celular, codigo);

    const usuarios = this.dataSource.getRepository(Usuario);
    const usuario = await usuarios.findOne({ where: { celular } });
    if (!usuario) throw new UnauthorizedException('El código no es válido o ya expiró. Pide uno nuevo.');
    this.validarActivo(usuario);

    if (!usuario.celularVerificado) {
      await usuarios.update(usuario.id, { celularVerificado: true });
      await this.darCreditosDeBienvenida(usuario);
    }
    return this.crearSesion(usuario.id);
  }

  async login(dto: LoginDto): Promise<Sesion> {
    const incorrecto = new UnauthorizedException('Usuario o contraseña incorrectos.');
    const esCorreo = dto.usuario.includes('@');
    const celular = esCorreo ? null : normalizarCelular(dto.usuario);
    if (!esCorreo && !celular) throw incorrecto;

    const usuario = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where(esCorreo ? 'u.correo = :valor' : 'u.celular = :valor', {
        valor: esCorreo ? dto.usuario.toLowerCase() : celular,
      })
      .getOne();

    if (!usuario?.passwordHash || !(await bcrypt.compare(dto.password, usuario.passwordHash))) {
      throw incorrecto;
    }
    this.validarActivo(usuario);
    if (!usuario.celularVerificado) {
      throw new ForbiddenException('Primero verifica tu celular con el código que te enviamos por WhatsApp.');
    }
    return this.crearSesion(usuario.id);
  }

  async perfil(usuarioId: number): Promise<PerfilPublico> {
    const usuario = await this.dataSource.getRepository(Usuario).findOne({
      where: { id: usuarioId },
      relations: { barrio: true, ciudad: true, perfilMaestro: { areas: true } },
    });
    if (!usuario) throw new NotFoundException('La cuenta no existe.');
    const m = usuario.perfilMaestro;
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      celular: usuario.celular,
      correo: usuario.correo,
      rol: usuario.rol,
      celularVerificado: usuario.celularVerificado,
      barrio: usuario.barrio?.nombre ?? usuario.barrioTexto,
      ciudad: usuario.ciudad ? { id: usuario.ciudad.id, nombre: usuario.ciudad.nombre } : null,
      ubicacionAproximada: usuario.ubicacionAproximada,
      maestro: m
        ? {
            aniosExperiencia: m.aniosExperiencia,
            verificacion: m.verificacion,
            saldoCreditos: m.saldoCreditos,
            calificacionPromedio: m.calificacionPromedio,
            radioKm: m.radioKm,
            recibeAvisos: m.recibeAvisos,
            areas: (m.areas ?? []).map((a) => ({ slug: a.slug, nombre: a.nombre })),
          }
        : null,
    };
  }

  private async crearSesion(usuarioId: number): Promise<Sesion> {
    const usuario = await this.perfil(usuarioId);
    const token = await this.jwt.signAsync({ sub: usuario.id, rol: usuario.rol });
    return { token, usuario };
  }

  private async darCreditosDeBienvenida(usuario: Usuario): Promise<void> {
    if (usuario.rol !== RolUsuario.MAESTRO) return;
    const cantidad = Number(this.config.get('CREDITOS_BIENVENIDA', 10));
    if (!cantidad) return;
    try {
      await this.creditos.registrar({
        maestroId: usuario.id,
        tipo: TipoMovimientoCredito.REGALO,
        cantidad,
        referenciaTipo: 'bienvenida',
        referenciaId: usuario.id,
        descripcion: 'Créditos de bienvenida',
      });
    } catch (error) {
      // No impedir el ingreso si falla el regalo; queda en el log para revisarlo.
      this.logger.error(`No se pudieron dar créditos de bienvenida al usuario ${usuario.id}`, error as Error);
    }
  }

  private celularValido(texto: string): string {
    const celular = normalizarCelular(texto);
    if (!celular) throw new BadRequestException('El número de celular no es válido.');
    return celular;
  }

  private validarActivo(usuario: Usuario): void {
    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ForbiddenException('Tu cuenta está suspendida. Escríbenos para revisarla.');
    }
  }
}
