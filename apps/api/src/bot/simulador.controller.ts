import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DataSource } from 'typeorm';
import { Roles } from '../auth/decoradores';
import { normalizarCelular } from '../common/telefono';
import { Conversacion, MensajeWhatsapp } from '../database/entities';
import { CanalSolicitud, EstadoConversacion, RolUsuario } from '../database/enums';
import { SolicitudesService } from '../solicitudes/solicitudes.service';
import { ConversacionService } from './conversacion.service';

class UbicacionDto {
  @Max(90)
  @Min(-90)
  @IsNumber({}, { message: 'La latitud no es válida.' })
  latitud: number;

  @Max(180)
  @Min(-180)
  @IsNumber({}, { message: 'La longitud no es válida.' })
  longitud: number;
}

class MensajeSimuladoDto {
  @MaxLength(25)
  @IsString({ message: 'Escribe el celular del cliente de prueba.' })
  celular: string;

  @IsOptional()
  @MaxLength(120)
  @IsString()
  nombre?: string;

  @IsOptional()
  @MaxLength(2000, { message: 'El mensaje es demasiado largo.' })
  @IsString()
  texto?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UbicacionDto)
  ubicacion?: UbicacionDto;
}

/**
 * Simulador de WhatsApp: permite probar el bot desde la web, sin Meta.
 * Usa exactamente el mismo cerebro que usará el webhook de WhatsApp.
 */
@Roles(RolUsuario.ADMIN)
@Controller('admin/simulador')
export class SimuladorController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly conversacion: ConversacionService,
    private readonly solicitudes: SolicitudesService,
  ) {}

  @HttpCode(200)
  @Post('mensajes')
  async enviar(@Body() dto: MensajeSimuladoDto) {
    if (!dto.texto?.trim() && !dto.ubicacion) throw new BadRequestException('Escribe un mensaje o envía una ubicación.');
    const resultado = await this.conversacion.procesar({
      celular: dto.celular,
      nombrePerfil: dto.nombre,
      texto: dto.texto,
      ubicacion: dto.ubicacion,
      canal: CanalSolicitud.WEB,
    });
    return {
      respuestas: resultado.respuestas,
      estado: resultado.estado,
      solicitud: resultado.solicitudId ? await this.solicitudes.detalle(resultado.solicitudId) : null,
    };
  }

  @Get(':celular')
  async ver(@Param('celular') celularTexto: string) {
    const celular = this.celular(celularTexto);
    const conv = await this.dataSource.getRepository(Conversacion).findOne({ where: { celular } });
    const mensajes = await this.dataSource.getRepository(MensajeWhatsapp).find({
      where: { celular },
      order: { id: 'DESC' },
      take: 100,
    });
    return {
      estado: conv?.estado ?? EstadoConversacion.INICIO,
      solicitud: conv?.solicitudId ? await this.solicitudes.detalle(conv.solicitudId) : null,
      mensajes: mensajes.reverse().map((m) => ({
        id: m.id,
        direccion: m.direccion,
        tipo: m.tipo,
        texto: m.texto,
        ubicacion: (m.contenido as { ubicacion?: unknown } | null)?.ubicacion ?? null,
        creadoEn: m.creadoEn,
      })),
    };
  }

  /** Deja la conversación como nueva (no borra las solicitudes ya publicadas). */
  @HttpCode(204)
  @Delete(':celular')
  async reiniciar(@Param('celular') celularTexto: string) {
    const celular = this.celular(celularTexto);
    await this.dataSource.getRepository(Conversacion).delete({ celular });
    await this.dataSource.getRepository(MensajeWhatsapp).delete({ celular });
  }

  private celular(texto: string): string {
    const celular = normalizarCelular(texto);
    if (!celular) throw new BadRequestException('El número de celular no es válido.');
    return celular;
  }
}
