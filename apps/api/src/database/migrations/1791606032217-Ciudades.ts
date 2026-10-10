import { MigrationInterface, QueryRunner } from "typeorm";

export class Ciudades1791606032217 implements MigrationInterface {
    name = 'Ciudades1791606032217'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`uq_barrios_ciudad_nombre\` ON \`barrios\``);
        await queryRunner.query(`CREATE TABLE \`ciudades\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`nombre\` varchar(80) NOT NULL, \`nombreNormalizado\` varchar(80) NOT NULL, \`departamento\` varchar(80) NOT NULL, \`codigoDane\` varchar(5) NOT NULL, \`latitud\` decimal(9,6) NOT NULL, \`longitud\` decimal(9,6) NOT NULL, \`activa\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_6bc5f1706e16bf35ca4f7d614c\` (\`nombreNormalizado\`), UNIQUE INDEX \`IDX_5a5055d21f294d89f2c7541433\` (\`codigoDane\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`conversaciones\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`celular\` varchar(20) NOT NULL, \`usuarioId\` int UNSIGNED NULL, \`estado\` enum ('inicio', 'esperando_ciudad', 'esperando_ubicacion', 'esperando_confirmacion', 'publicada') NOT NULL DEFAULT 'inicio', \`solicitudId\` int UNSIGNED NULL, \`contexto\` json NULL, \`ultimoMensajeEn\` datetime NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_28cdac9a1436efa73684acc5cf\` (\`celular\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`ALTER TABLE \`barrios\` DROP COLUMN \`ciudad\``);
        await queryRunner.query(`ALTER TABLE \`barrios\` ADD \`ciudadId\` int UNSIGNED NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`barrios\` ADD \`nombreNormalizado\` varchar(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`ciudadId\` int UNSIGNED NULL`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`ubicacionAproximada\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD \`ciudadId\` int UNSIGNED NULL`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD \`ubicacionAproximada\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_barrios_ciudad_nombre\` ON \`barrios\` (\`ciudadId\`, \`nombreNormalizado\`)`);
        await queryRunner.query(`ALTER TABLE \`barrios\` ADD CONSTRAINT \`FK_82aa0afebcb556f967d9444418f\` FOREIGN KEY (\`ciudadId\`) REFERENCES \`ciudades\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD CONSTRAINT \`FK_266a3b6afc34e9b16a07a27f921\` FOREIGN KEY (\`ciudadId\`) REFERENCES \`ciudades\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_8d4478a5c35d252025a4aa0b2e7\` FOREIGN KEY (\`ciudadId\`) REFERENCES \`ciudades\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversaciones\` ADD CONSTRAINT \`FK_0a9a3f9130f72a331912ee2bb20\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversaciones\` ADD CONSTRAINT \`FK_c3a882746077b12613f1ffc8615\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversaciones\` DROP FOREIGN KEY \`FK_c3a882746077b12613f1ffc8615\``);
        await queryRunner.query(`ALTER TABLE \`conversaciones\` DROP FOREIGN KEY \`FK_0a9a3f9130f72a331912ee2bb20\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_8d4478a5c35d252025a4aa0b2e7\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_266a3b6afc34e9b16a07a27f921\``);
        await queryRunner.query(`ALTER TABLE \`barrios\` DROP FOREIGN KEY \`FK_82aa0afebcb556f967d9444418f\``);
        await queryRunner.query(`DROP INDEX \`uq_barrios_ciudad_nombre\` ON \`barrios\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP COLUMN \`ubicacionAproximada\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP COLUMN \`ciudadId\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`ubicacionAproximada\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`ciudadId\``);
        await queryRunner.query(`ALTER TABLE \`barrios\` DROP COLUMN \`nombreNormalizado\``);
        await queryRunner.query(`ALTER TABLE \`barrios\` DROP COLUMN \`ciudadId\``);
        await queryRunner.query(`ALTER TABLE \`barrios\` ADD \`ciudad\` varchar(80) NOT NULL DEFAULT 'Bogotá'`);
        await queryRunner.query(`DROP INDEX \`IDX_28cdac9a1436efa73684acc5cf\` ON \`conversaciones\``);
        await queryRunner.query(`DROP TABLE \`conversaciones\``);
        await queryRunner.query(`DROP INDEX \`IDX_5a5055d21f294d89f2c7541433\` ON \`ciudades\``);
        await queryRunner.query(`DROP INDEX \`IDX_6bc5f1706e16bf35ca4f7d614c\` ON \`ciudades\``);
        await queryRunner.query(`DROP TABLE \`ciudades\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`uq_barrios_ciudad_nombre\` ON \`barrios\` (\`ciudad\`, \`nombre\`)`);
    }

}
