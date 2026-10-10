/**
 * Importa barrios de una ciudad desde un archivo CSV o GeoJSON.
 *
 * Uso (desde la raíz del repo):
 *   npm run importar-barrios -w apps/api -- <codigoDane> <archivo> [campoNombre] [campoLocalidad]
 *
 * Ejemplos:
 *   npm run importar-barrios -w apps/api -- 11001 ./barrios-bogota.geojson NOMBRE LOCALIDAD
 *   npm run importar-barrios -w apps/api -- 13001 ./barrios-cartagena.csv
 *
 * CSV: columnas nombre, latitud, longitud y (opcional) localidad, separadas por coma o punto y coma.
 * GeoJSON: polígonos o puntos; para polígonos se usa el centro aproximado (promedio de vértices).
 * Los barrios que ya existen (mismo nombre en la misma ciudad) se actualizan.
 */
import * as fs from 'fs';
import dataSource from '../database/data-source';
import { normalizar } from '../common/texto';
import { Barrio, Ciudad } from '../database/entities';

interface Fila {
  nombre: string;
  localidad: string | null;
  latitud: number;
  longitud: number;
}

function centro(geometria: any): [number, number] | null {
  if (!geometria) return null;
  if (geometria.type === 'Point') return [geometria.coordinates[0], geometria.coordinates[1]];
  const puntos: number[][] = [];
  const recorrer = (c: any) => {
    if (typeof c?.[0] === 'number') puntos.push(c);
    else if (Array.isArray(c)) c.forEach(recorrer);
  };
  recorrer(geometria.coordinates);
  if (!puntos.length) return null;
  const lon = puntos.reduce((s, p) => s + p[0], 0) / puntos.length;
  const lat = puntos.reduce((s, p) => s + p[1], 0) / puntos.length;
  return [lon, lat];
}

function leerGeoJson(texto: string, campoNombre: string, campoLocalidad?: string): Fila[] {
  const datos = JSON.parse(texto);
  return (datos.features ?? [])
    .map((f: any) => {
      const p = f.properties ?? {};
      const c = centro(f.geometry);
      const nombre = String(p[campoNombre] ?? '').trim();
      if (!c || !nombre) return null;
      return {
        nombre,
        localidad: campoLocalidad ? String(p[campoLocalidad] ?? '').trim() || null : null,
        longitud: c[0],
        latitud: c[1],
      };
    })
    .filter(Boolean) as Fila[];
}

function leerCsv(texto: string): Fila[] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const sep = lineas[0].includes(';') ? ';' : ',';
  const cab = lineas[0].split(sep).map((c) => normalizar(c));
  const i = (n: string) => cab.indexOf(n);
  if (i('nombre') < 0 || i('latitud') < 0 || i('longitud') < 0) {
    throw new Error('El CSV debe tener las columnas: nombre, latitud, longitud (y opcional localidad).');
  }
  return lineas.slice(1).map((l) => {
    const c = l.split(sep);
    return {
      nombre: c[i('nombre')].trim(),
      localidad: i('localidad') >= 0 ? c[i('localidad')]?.trim() || null : null,
      latitud: Number(c[i('latitud')].replace(',', '.')),
      longitud: Number(c[i('longitud')].replace(',', '.')),
    };
  });
}

async function main() {
  const [dane, archivo, campoNombre = 'nombre', campoLocalidad] = process.argv.slice(2);
  if (!dane || !archivo) {
    console.error('Uso: npm run importar-barrios -w apps/api -- <codigoDane> <archivo> [campoNombre] [campoLocalidad]');
    process.exit(1);
  }
  const texto = fs.readFileSync(archivo, 'utf8');
  const filas = archivo.toLowerCase().endsWith('.csv') ? leerCsv(texto) : leerGeoJson(texto, campoNombre, campoLocalidad);

  // Validación básica: coordenadas dentro de Colombia.
  const validas = filas.filter(
    (f) => f.nombre && f.latitud > -5 && f.latitud < 14 && f.longitud > -82 && f.longitud < -66,
  );
  if (!validas.length) {
    console.error('No se encontraron barrios válidos. Revisa el archivo y el nombre de las columnas.');
    process.exit(1);
  }

  await dataSource.initialize();
  try {
    const ciudad = await dataSource.getRepository(Ciudad).findOne({ where: { codigoDane: dane } });
    if (!ciudad) throw new Error(`No existe una ciudad con código DANE ${dane}.`);

    // Si el archivo trae el mismo barrio varias veces, se queda la primera aparición.
    const unicos = new Map<string, Fila>();
    for (const f of validas) {
      const clave = normalizar(f.nombre);
      if (!unicos.has(clave)) unicos.set(clave, f);
    }

    await dataSource
      .createQueryBuilder()
      .insert()
      .into(Barrio)
      .values(
        [...unicos.entries()].map(([nombreNormalizado, f]) => ({
          ciudadId: ciudad.id,
          nombre: f.nombre,
          nombreNormalizado,
          localidad: f.localidad,
          latitud: Number(f.latitud.toFixed(6)),
          longitud: Number(f.longitud.toFixed(6)),
        })),
      )
      .orUpdate(['nombre', 'localidad', 'latitud', 'longitud'], ['ciudadId', 'nombreNormalizado'])
      .execute();

    console.log(`Listo: ${unicos.size} barrios importados o actualizados en ${ciudad.nombre}.`);
    if (validas.length < filas.length) {
      console.log(`Se omitieron ${filas.length - validas.length} filas sin nombre o con coordenadas fuera de Colombia.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
