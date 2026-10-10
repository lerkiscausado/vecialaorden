import { MigrationInterface, QueryRunner } from "typeorm";

export class ConfiguracionIa1791605361162 implements MigrationInterface {
    name = 'ConfiguracionIa1791605361162'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`configuraciones_ia\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`nombre\` varchar(80) NOT NULL, \`proveedor\` enum ('anthropic', 'openai', 'gemini', 'openai_compatible') NOT NULL, \`modelo\` varchar(120) NOT NULL, \`apiKeyCifrada\` text NOT NULL, \`apiKeyFinal\` varchar(8) NOT NULL, \`baseUrl\` varchar(255) NULL, \`temperatura\` decimal(3,2) NULL, \`maxTokens\` int UNSIGNED NOT NULL DEFAULT '1024', \`proposito\` enum ('analisis_solicitudes', 'general') NOT NULL DEFAULT 'analisis_solicitudes', \`activa\` tinyint NOT NULL DEFAULT 0, \`actualizadoPorId\` int UNSIGNED NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_configuraciones_ia_proposito\` (\`proposito\`, \`activa\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`registros_ia\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`configuracionId\` int UNSIGNED NULL, \`proveedor\` enum ('anthropic', 'openai', 'gemini', 'openai_compatible') NOT NULL, \`modelo\` varchar(120) NOT NULL, \`proposito\` enum ('analisis_solicitudes', 'general') NOT NULL, \`tokensEntrada\` int UNSIGNED NULL, \`tokensSalida\` int UNSIGNED NULL, \`duracionMs\` int UNSIGNED NOT NULL, \`exito\` tinyint NOT NULL, \`error\` varchar(500) NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_registros_ia_fecha\` (\`creadoEn\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` CHANGE \`rol\` \`rol\` enum ('cliente', 'maestro', 'admin', 'superadmin') NOT NULL DEFAULT 'cliente'`);
        await queryRunner.query(`ALTER TABLE \`registros_ia\` ADD CONSTRAINT \`FK_6546d00849270e77850f6f0c1c1\` FOREIGN KEY (\`configuracionId\`) REFERENCES \`configuraciones_ia\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`registros_ia\` DROP FOREIGN KEY \`FK_6546d00849270e77850f6f0c1c1\``);
        // Antes de quitar el rol, los superadmin pasan a admin para no perder datos.
        await queryRunner.query(`UPDATE \`usuarios\` SET \`rol\` = 'admin' WHERE \`rol\` = 'superadmin'`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` CHANGE \`rol\` \`rol\` enum ('cliente', 'maestro', 'admin') NOT NULL DEFAULT 'cliente'`);
        await queryRunner.query(`DROP INDEX \`idx_registros_ia_fecha\` ON \`registros_ia\``);
        await queryRunner.query(`DROP TABLE \`registros_ia\``);
        await queryRunner.query(`DROP INDEX \`idx_configuraciones_ia_proposito\` ON \`configuraciones_ia\``);
        await queryRunner.query(`DROP TABLE \`configuraciones_ia\``);
    }

}
