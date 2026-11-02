import { MigrationInterface, QueryRunner } from "typeorm";

export class Sesiones1793549435923 implements MigrationInterface {
    name = 'Sesiones1793549435923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`sesiones\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`usuarioId\` int UNSIGNED NOT NULL, \`familia\` char(32) NOT NULL, \`tokenHash\` char(64) NOT NULL, \`expiraEn\` datetime NOT NULL, \`reemplazadaEn\` datetime NULL, \`revocadaEn\` datetime NULL, \`agente\` varchar(255) NULL, \`ip\` varchar(45) NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`uq_sesiones_hash\` (\`tokenHash\`), INDEX \`idx_sesiones_familia\` (\`familia\`), INDEX \`idx_sesiones_usuario\` (\`usuarioId\`, \`revocadaEn\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`sesiones\` ADD CONSTRAINT \`FK_1e2e12e2ffd791298d701f2ae55\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sesiones\` DROP FOREIGN KEY \`FK_1e2e12e2ffd791298d701f2ae55\``);
        await queryRunner.query(`DROP INDEX \`idx_sesiones_usuario\` ON \`sesiones\``);
        await queryRunner.query(`DROP INDEX \`idx_sesiones_familia\` ON \`sesiones\``);
        await queryRunner.query(`DROP INDEX \`uq_sesiones_hash\` ON \`sesiones\``);
        await queryRunner.query(`DROP TABLE \`sesiones\``);
    }

}
