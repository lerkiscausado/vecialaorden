import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Datos iniciales: áreas de servicio y paquetes de créditos.
 * Los precios de referencia por área quedan vacíos a propósito: se llenan
 * con datos reales del mercado (o de la propia plataforma) más adelante.
 */
const AREAS: Array<[slug: string, nombre: string, unidad: string, palabras: string[]]> = [
  ['estuco-pintura', 'Estuco y pintura', 'm2', ['estuco', 'pintura', 'pintar', 'resanar', 'pared', 'paredes', 'graniplast']],
  ['drywall', 'Drywall', 'm2', ['drywall', 'dry wall', 'cielo raso', 'cielorraso', 'cielo razo', 'superboard', 'panel yeso']],
  ['plomeria', 'Plomería', 'visita', ['fuga', 'gotea', 'goteando', 'tubo', 'tubería', 'lavaplatos', 'sanitario', 'inodoro', 'ducha', 'grifo', 'llave', 'plomero', 'destapar']],
  ['electricidad', 'Electricidad', 'visita', ['enchufe', 'toma', 'tomacorriente', 'luz', 'cable', 'breaker', 'corto', 'eléctrico', 'lámpara', 'electricista']],
  ['carpinteria', 'Carpintería', 'trabajo', ['puerta', 'closet', 'clóset', 'madera', 'mueble', 'cocina integral', 'cajón', 'carpintero']],
  ['enchape', 'Enchape', 'm2', ['baldosa', 'cerámica', 'enchape', 'porcelanato', 'piso', 'azulejo', 'guarda escoba']],
  ['obra-general', 'Maestro de obra general', 'trabajo', ['remodelación', 'remodelar', 'obra', 'muro', 'ladrillo', 'pañete', 'mampostería']],
];

const PAQUETES: Array<[nombre: string, precio: number, creditos: number, orden: number]> = [
  ['Básico', 20000, 20, 1],
  ['Recomendado', 45000, 50, 2],
  ['Pro', 100000, 120, 3],
];

export class DatosIniciales1791604600000 implements MigrationInterface {
  name = 'DatosIniciales1791604600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [slug, nombre, unidad, palabras] of AREAS) {
      await queryRunner.query(
        'INSERT INTO `areas` (`slug`, `nombre`, `unidadReferencia`, `palabrasClave`, `activa`) VALUES (?, ?, ?, ?, 1)',
        [slug, nombre, unidad, JSON.stringify(palabras)],
      );
    }
    for (const [nombre, precio, creditos, orden] of PAQUETES) {
      await queryRunner.query(
        'INSERT INTO `paquetes_credito` (`nombre`, `precio`, `creditos`, `orden`, `activo`) VALUES (?, ?, ?, ?, 1)',
        [nombre, precio, creditos, orden],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`paquetes_credito\` WHERE \`nombre\` IN (${PAQUETES.map(() => '?').join(', ')})`,
      PAQUETES.map(([nombre]) => nombre),
    );
    await queryRunner.query(
      `DELETE FROM \`areas\` WHERE \`slug\` IN (${AREAS.map(() => '?').join(', ')})`,
      AREAS.map(([slug]) => slug),
    );
  }
}
