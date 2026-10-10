import { DataSource } from 'typeorm';

/**
 * Hace que todas las conexiones del pool usen UTC, sin importar la zona
 * horaria configurada en el servidor MySQL. Así las fechas que pone la base
 * (CURRENT_TIMESTAMP) y las que pone la app coinciden.
 */
export async function forzarUtc(dataSource: DataSource): Promise<DataSource> {
  const pool = (dataSource.driver as unknown as { pool?: { on: Function } }).pool;
  pool?.on('connection', (conexion: { query: (sql: string) => void }) => {
    conexion.query("SET time_zone = '+00:00'");
  });
  // La conexión que TypeORM abrió al inicializar ya existe: se ajusta aquí.
  await dataSource.query("SET time_zone = '+00:00'");
  return dataSource;
}
