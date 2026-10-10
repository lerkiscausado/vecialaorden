import { DataSourceOptions } from 'typeorm';
import { ENTIDADES } from './entities';

type Entorno = Record<string, string | undefined>;

/**
 * Opciones de conexión compartidas por la app (NestJS) y la CLI de migraciones.
 * `synchronize` siempre en false: el esquema solo cambia con migraciones.
 */
export function opcionesBaseDeDatos(env: Entorno = process.env): DataSourceOptions {
  return {
    type: 'mysql',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    entities: ENTIDADES,
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'migraciones',
    synchronize: false,
    logging: env.DB_LOGGING === 'true',
  };
}
