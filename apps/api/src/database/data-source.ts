/**
 * Punto de entrada de la CLI de TypeORM (migraciones).
 * Lee las variables de apps/api/.env.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos } from './opciones';

cargarEnv(path.resolve(__dirname, '../../.env'));

export default new DataSource(opcionesBaseDeDatos());

/** Lector mínimo de archivos .env (sin dependencias extra). No pisa variables ya definidas. */
function cargarEnv(archivo: string): void {
  if (!fs.existsSync(archivo)) return;
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
