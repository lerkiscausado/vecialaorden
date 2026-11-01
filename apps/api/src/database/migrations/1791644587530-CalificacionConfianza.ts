import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Calificación por aspectos: confianza, calidad, puntualidad y cumplimiento.
 * Si ya existieran reseñas, cada aspecto toma el valor de la calificación anterior.
 */
export class CalificacionConfianza1791644587530 implements MigrationInterface {
  name = 'CalificacionConfianza1791644587530';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`perfiles_maestro\` ADD \`confianzaPromedio\` decimal(3,2) NOT NULL DEFAULT '0.00'`);
    await q.query(`ALTER TABLE \`resenas\` MODIFY \`calificacion\` decimal(3,2) NOT NULL`);
    for (const aspecto of ['confianza', 'calidad', 'puntualidad', 'cumplimiento']) {
      await q.query(`ALTER TABLE \`resenas\` ADD \`${aspecto}\` tinyint UNSIGNED NULL`);
      await q.query(`UPDATE \`resenas\` SET \`${aspecto}\` = ROUND(\`calificacion\`)`);
      await q.query(`ALTER TABLE \`resenas\` MODIFY \`${aspecto}\` tinyint UNSIGNED NOT NULL`);
    }
    await q.query(`UPDATE \`perfiles_maestro\` pm SET \`confianzaPromedio\` =
      COALESCE((SELECT AVG(r.\`confianza\`) FROM \`resenas\` r WHERE r.\`maestroId\` = pm.\`usuarioId\`), 0)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const aspecto of ['cumplimiento', 'puntualidad', 'calidad', 'confianza']) {
      await q.query(`ALTER TABLE \`resenas\` DROP COLUMN \`${aspecto}\``);
    }
    await q.query(`ALTER TABLE \`resenas\` MODIFY \`calificacion\` tinyint UNSIGNED NOT NULL`);
    await q.query(`ALTER TABLE \`perfiles_maestro\` DROP COLUMN \`confianzaPromedio\``);
  }
}
