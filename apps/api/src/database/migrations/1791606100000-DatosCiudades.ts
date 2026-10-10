import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ciudades iniciales. Bogotá y Cartagena quedan activas; las demás se cargan
 * inactivas para reconocerlas ("pronto llegamos a tu ciudad") y activarlas después.
 * Las coordenadas son el punto central aproximado de cada ciudad.
 */
const CIUDADES: Array<[nombre: string, normalizado: string, departamento: string, dane: string, lat: number, lon: number, activa: boolean]> = [
  ['Bogotá', 'bogota', 'Bogotá D.C.', '11001', 4.711, -74.0721, true],
  ['Cartagena', 'cartagena', 'Bolívar', '13001', 10.391, -75.4794, true],
  ['Medellín', 'medellin', 'Antioquia', '05001', 6.2442, -75.5812, false],
  ['Cali', 'cali', 'Valle del Cauca', '76001', 3.4516, -76.532, false],
  ['Barranquilla', 'barranquilla', 'Atlántico', '08001', 10.9685, -74.7813, false],
  ['Bucaramanga', 'bucaramanga', 'Santander', '68001', 7.1193, -73.1227, false],
  ['Santa Marta', 'santa marta', 'Magdalena', '47001', 11.2408, -74.199, false],
  ['Pereira', 'pereira', 'Risaralda', '66001', 4.8133, -75.6961, false],
];

export class DatosCiudades1791606100000 implements MigrationInterface {
  name = 'DatosCiudades1791606100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [nombre, normalizado, departamento, dane, lat, lon, activa] of CIUDADES) {
      await queryRunner.query(
        'INSERT INTO `ciudades` (`nombre`, `nombreNormalizado`, `departamento`, `codigoDane`, `latitud`, `longitud`, `activa`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nombre, normalizado, departamento, dane, lat, lon, activa ? 1 : 0],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`ciudades\` WHERE \`codigoDane\` IN (${CIUDADES.map(() => '?').join(', ')})`,
      CIUDADES.map((c) => c[3]),
    );
  }
}
