import { MigrationInterface, QueryRunner } from "typeorm";

export class EsquemaInicial1791604490544 implements MigrationInterface {
    name = 'EsquemaInicial1791604490544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`areas\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`slug\` varchar(60) NOT NULL, \`nombre\` varchar(100) NOT NULL, \`palabrasClave\` json NULL, \`unidadReferencia\` varchar(30) NULL, \`precioRefMin\` int UNSIGNED NULL, \`precioRefMax\` int UNSIGNED NULL, \`activa\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_b7c3c95e1c6dfe264ba33bf482\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`barrios\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`nombre\` varchar(120) NOT NULL, \`localidad\` varchar(120) NULL, \`ciudad\` varchar(80) NOT NULL DEFAULT 'Bogotá', \`latitud\` decimal(9,6) NOT NULL, \`longitud\` decimal(9,6) NOT NULL, UNIQUE INDEX \`uq_barrios_ciudad_nombre\` (\`ciudad\`, \`nombre\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`codigos_otp\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`celular\` varchar(20) NOT NULL, \`codigoHash\` varchar(64) NOT NULL, \`proposito\` enum ('login', 'verificar_celular') NOT NULL, \`expiraEn\` datetime NOT NULL, \`intentos\` tinyint UNSIGNED NOT NULL DEFAULT '0', \`usadoEn\` datetime NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_codigos_otp_celular\` (\`celular\`, \`creadoEn\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`perfiles_maestro\` (\`usuarioId\` int UNSIGNED NOT NULL, \`aniosExperiencia\` tinyint UNSIGNED NOT NULL DEFAULT '0', \`descripcion\` text NULL, \`radioKm\` smallint UNSIGNED NOT NULL DEFAULT '10', \`verificacion\` enum ('pendiente', 'verificado', 'rechazado') NOT NULL DEFAULT 'pendiente', \`recibeAvisos\` tinyint NOT NULL DEFAULT 1, \`calificacionPromedio\` decimal(3,2) NOT NULL DEFAULT '0.00', \`totalResenas\` int UNSIGNED NOT NULL DEFAULT '0', \`trabajosCompletados\` int UNSIGNED NOT NULL DEFAULT '0', \`saldoCreditos\` int NOT NULL DEFAULT '0', \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`usuarioId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`usuarios\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`nombre\` varchar(120) NOT NULL, \`celular\` varchar(20) NOT NULL, \`correo\` varchar(160) NULL, \`passwordHash\` varchar(100) NULL, \`rol\` enum ('cliente', 'maestro', 'admin') NOT NULL DEFAULT 'cliente', \`estado\` enum ('activo', 'suspendido') NOT NULL DEFAULT 'activo', \`celularVerificado\` tinyint NOT NULL DEFAULT 0, \`barrioId\` int UNSIGNED NULL, \`barrioTexto\` varchar(160) NULL, \`latitud\` decimal(9,6) NULL, \`longitud\` decimal(9,6) NULL, \`aceptoDatosEn\` datetime NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_26195374e7857343c57a1080ce\` (\`celular\`), UNIQUE INDEX \`IDX_63665765c1a778a770c9bd585d\` (\`correo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`solicitudes\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`codigo\` varchar(12) NOT NULL, \`clienteId\` int UNSIGNED NOT NULL, \`canal\` enum ('whatsapp', 'web') NOT NULL DEFAULT 'whatsapp', \`descripcion\` text NOT NULL, \`resumen\` varchar(500) NULL, \`medidas\` json NULL, \`tamano\` enum ('pequeno', 'mediano', 'grande') NOT NULL DEFAULT 'mediano', \`urgente\` tinyint NOT NULL DEFAULT 0, \`barrioId\` int UNSIGNED NULL, \`barrioTexto\` varchar(160) NULL, \`latitud\` decimal(9,6) NULL, \`longitud\` decimal(9,6) NULL, \`precioRefMin\` int UNSIGNED NULL, \`precioRefMax\` int UNSIGNED NULL, \`creditosPorCotizacion\` tinyint UNSIGNED NOT NULL DEFAULT '3', \`cuposMax\` tinyint UNSIGNED NOT NULL DEFAULT '5', \`cuposUsados\` tinyint UNSIGNED NOT NULL DEFAULT '0', \`estado\` enum ('borrador', 'abierta', 'cupos_llenos', 'asignada', 'completada', 'cancelada', 'vencida') NOT NULL DEFAULT 'borrador', \`maestroAsignadoId\` int UNSIGNED NULL, \`publicadaEn\` datetime NULL, \`expiraEn\` datetime NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_solicitudes_cliente\` (\`clienteId\`), INDEX \`idx_solicitudes_estado\` (\`estado\`, \`creadoEn\`), UNIQUE INDEX \`IDX_5ed7d54ad273dbe4f709830d52\` (\`codigo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`cotizaciones\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`solicitudId\` int UNSIGNED NOT NULL, \`maestroId\` int UNSIGNED NOT NULL, \`precioTotal\` int UNSIGNED NOT NULL, \`manoDeObra\` int UNSIGNED NOT NULL, \`materiales\` int UNSIGNED NOT NULL DEFAULT '0', \`mensaje\` text NULL, \`fechaDisponible\` date NULL, \`duracionDias\` smallint UNSIGNED NULL, \`creditosCobrados\` tinyint UNSIGNED NOT NULL, \`estado\` enum ('enviada', 'elegida', 'descartada', 'retirada') NOT NULL DEFAULT 'enviada', \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_cotizaciones_maestro\` (\`maestroId\`, \`creadoEn\`), UNIQUE INDEX \`uq_cotizacion_solicitud_maestro\` (\`solicitudId\`, \`maestroId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`documentos_maestro\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`maestroId\` int UNSIGNED NOT NULL, \`tipo\` enum ('cedula', 'antecedentes', 'otro') NOT NULL, \`driveFileId\` varchar(120) NOT NULL, \`nombreArchivo\` varchar(200) NOT NULL, \`estado\` enum ('pendiente', 'verificado', 'rechazado') NOT NULL DEFAULT 'pendiente', \`observacion\` varchar(255) NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_documentos_maestro\` (\`maestroId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`mensajes_whatsapp\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`waMessageId\` varchar(128) NULL, \`celular\` varchar(20) NOT NULL, \`direccion\` enum ('entrante', 'saliente') NOT NULL, \`tipo\` varchar(30) NOT NULL, \`texto\` text NULL, \`contenido\` json NULL, \`solicitudId\` int UNSIGNED NULL, \`procesadoEn\` datetime NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_mensajes_celular\` (\`celular\`, \`creadoEn\`), UNIQUE INDEX \`IDX_203800e4ffabef372109270fc9\` (\`waMessageId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`movimientos_credito\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`maestroId\` int UNSIGNED NOT NULL, \`tipo\` enum ('compra', 'regalo', 'cotizacion', 'devolucion', 'vencimiento', 'ajuste') NOT NULL, \`cantidad\` int NOT NULL, \`saldoResultante\` int NOT NULL, \`referenciaTipo\` varchar(30) NULL, \`referenciaId\` varchar(64) NULL, \`descripcion\` varchar(255) NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`uq_movimiento_referencia\` (\`tipo\`, \`referenciaTipo\`, \`referenciaId\`), INDEX \`idx_movimientos_maestro\` (\`maestroId\`, \`creadoEn\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`notificaciones_solicitud\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`solicitudId\` int UNSIGNED NOT NULL, \`maestroId\` int UNSIGNED NOT NULL, \`canal\` enum ('correo', 'whatsapp') NOT NULL, \`distanciaKm\` decimal(6,2) NULL, \`enviadaEn\` datetime NULL, \`error\` varchar(255) NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_notificaciones_maestro\` (\`maestroId\`, \`creadoEn\`), UNIQUE INDEX \`uq_notificacion_solicitud_maestro_canal\` (\`solicitudId\`, \`maestroId\`, \`canal\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`paquetes_credito\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`nombre\` varchar(60) NOT NULL, \`precio\` int UNSIGNED NOT NULL, \`creditos\` int UNSIGNED NOT NULL, \`activo\` tinyint NOT NULL DEFAULT 1, \`orden\` tinyint UNSIGNED NOT NULL DEFAULT '0', \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`pagos\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`maestroId\` int UNSIGNED NOT NULL, \`paqueteId\` int UNSIGNED NULL, \`referencia\` varchar(64) NOT NULL, \`transaccionId\` varchar(64) NULL, \`monto\` int UNSIGNED NOT NULL, \`creditos\` int UNSIGNED NOT NULL, \`estado\` enum ('pendiente', 'aprobado', 'rechazado', 'anulado', 'error') NOT NULL DEFAULT 'pendiente', \`metodo\` varchar(30) NULL, \`datosPasarela\` json NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`actualizadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_pagos_maestro\` (\`maestroId\`, \`creadoEn\`), UNIQUE INDEX \`IDX_82f3e0738f34c48ea8b8a5ccb7\` (\`referencia\`), UNIQUE INDEX \`IDX_f572c2950caef99a68cc74baa7\` (\`transaccionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`resenas\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`solicitudId\` int UNSIGNED NOT NULL, \`clienteId\` int UNSIGNED NOT NULL, \`maestroId\` int UNSIGNED NOT NULL, \`calificacion\` tinyint UNSIGNED NOT NULL, \`comentario\` text NULL, \`creadoEn\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_resenas_maestro\` (\`maestroId\`, \`creadoEn\`), UNIQUE INDEX \`REL_cc4f45f1b9a69da1b063218d7f\` (\`solicitudId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`maestro_areas\` (\`maestroId\` int UNSIGNED NOT NULL, \`areaId\` int UNSIGNED NOT NULL, INDEX \`IDX_8b1534436c631c37007b0c5282\` (\`maestroId\`), INDEX \`IDX_d6ca81187625a7aea1f1a83c51\` (\`areaId\`), PRIMARY KEY (\`maestroId\`, \`areaId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE \`solicitud_areas\` (\`solicitudId\` int UNSIGNED NOT NULL, \`areaId\` int UNSIGNED NOT NULL, INDEX \`IDX_9916dd0c25d0acd59f5f6e20ab\` (\`solicitudId\`), INDEX \`IDX_d51e1eba406cb63069c4dfb0e7\` (\`areaId\`), PRIMARY KEY (\`solicitudId\`, \`areaId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`ALTER TABLE \`perfiles_maestro\` ADD CONSTRAINT \`FK_196b787c380a70a6765e93b3e7d\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD CONSTRAINT \`FK_db3e19d66ecb49bfca80fa998f2\` FOREIGN KEY (\`barrioId\`) REFERENCES \`barrios\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_8647c62a4fb649befc52fc26622\` FOREIGN KEY (\`clienteId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_10ba21a923726f8f82d16aa21b1\` FOREIGN KEY (\`barrioId\`) REFERENCES \`barrios\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` ADD CONSTRAINT \`FK_97fc639f392f61cfc1b9c178bf4\` FOREIGN KEY (\`maestroAsignadoId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cotizaciones\` ADD CONSTRAINT \`FK_aa25f38b643845a094edb3f0b64\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cotizaciones\` ADD CONSTRAINT \`FK_85ee5b1723540ce16602c501dd0\` FOREIGN KEY (\`maestroId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`documentos_maestro\` ADD CONSTRAINT \`FK_1e899e098ed3f60e15889041bdf\` FOREIGN KEY (\`maestroId\`) REFERENCES \`perfiles_maestro\`(\`usuarioId\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`mensajes_whatsapp\` ADD CONSTRAINT \`FK_8dce39f0372a1fbdc65fcc64dda\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movimientos_credito\` ADD CONSTRAINT \`FK_a793b34b591398d7882bde19f18\` FOREIGN KEY (\`maestroId\`) REFERENCES \`perfiles_maestro\`(\`usuarioId\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notificaciones_solicitud\` ADD CONSTRAINT \`FK_7a04485156efaa0d649760390b9\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notificaciones_solicitud\` ADD CONSTRAINT \`FK_f183c84c262c4710464d5572684\` FOREIGN KEY (\`maestroId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`pagos\` ADD CONSTRAINT \`FK_87b938de48d9afaa15dbe33ec45\` FOREIGN KEY (\`maestroId\`) REFERENCES \`perfiles_maestro\`(\`usuarioId\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`pagos\` ADD CONSTRAINT \`FK_f5b965766f00380c4cfde14adef\` FOREIGN KEY (\`paqueteId\`) REFERENCES \`paquetes_credito\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_cc4f45f1b9a69da1b063218d7f2\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_084f87a3467dde80fbab6b94724\` FOREIGN KEY (\`clienteId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_fa670dfb21bf294cbe2fac4753e\` FOREIGN KEY (\`maestroId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`maestro_areas\` ADD CONSTRAINT \`FK_8b1534436c631c37007b0c52828\` FOREIGN KEY (\`maestroId\`) REFERENCES \`perfiles_maestro\`(\`usuarioId\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`maestro_areas\` ADD CONSTRAINT \`FK_d6ca81187625a7aea1f1a83c512\` FOREIGN KEY (\`areaId\`) REFERENCES \`areas\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`solicitud_areas\` ADD CONSTRAINT \`FK_9916dd0c25d0acd59f5f6e20abb\` FOREIGN KEY (\`solicitudId\`) REFERENCES \`solicitudes\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`solicitud_areas\` ADD CONSTRAINT \`FK_d51e1eba406cb63069c4dfb0e76\` FOREIGN KEY (\`areaId\`) REFERENCES \`areas\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`solicitud_areas\` DROP FOREIGN KEY \`FK_d51e1eba406cb63069c4dfb0e76\``);
        await queryRunner.query(`ALTER TABLE \`solicitud_areas\` DROP FOREIGN KEY \`FK_9916dd0c25d0acd59f5f6e20abb\``);
        await queryRunner.query(`ALTER TABLE \`maestro_areas\` DROP FOREIGN KEY \`FK_d6ca81187625a7aea1f1a83c512\``);
        await queryRunner.query(`ALTER TABLE \`maestro_areas\` DROP FOREIGN KEY \`FK_8b1534436c631c37007b0c52828\``);
        await queryRunner.query(`ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_fa670dfb21bf294cbe2fac4753e\``);
        await queryRunner.query(`ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_084f87a3467dde80fbab6b94724\``);
        await queryRunner.query(`ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_cc4f45f1b9a69da1b063218d7f2\``);
        await queryRunner.query(`ALTER TABLE \`pagos\` DROP FOREIGN KEY \`FK_f5b965766f00380c4cfde14adef\``);
        await queryRunner.query(`ALTER TABLE \`pagos\` DROP FOREIGN KEY \`FK_87b938de48d9afaa15dbe33ec45\``);
        await queryRunner.query(`ALTER TABLE \`notificaciones_solicitud\` DROP FOREIGN KEY \`FK_f183c84c262c4710464d5572684\``);
        await queryRunner.query(`ALTER TABLE \`notificaciones_solicitud\` DROP FOREIGN KEY \`FK_7a04485156efaa0d649760390b9\``);
        await queryRunner.query(`ALTER TABLE \`movimientos_credito\` DROP FOREIGN KEY \`FK_a793b34b591398d7882bde19f18\``);
        await queryRunner.query(`ALTER TABLE \`mensajes_whatsapp\` DROP FOREIGN KEY \`FK_8dce39f0372a1fbdc65fcc64dda\``);
        await queryRunner.query(`ALTER TABLE \`documentos_maestro\` DROP FOREIGN KEY \`FK_1e899e098ed3f60e15889041bdf\``);
        await queryRunner.query(`ALTER TABLE \`cotizaciones\` DROP FOREIGN KEY \`FK_85ee5b1723540ce16602c501dd0\``);
        await queryRunner.query(`ALTER TABLE \`cotizaciones\` DROP FOREIGN KEY \`FK_aa25f38b643845a094edb3f0b64\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_97fc639f392f61cfc1b9c178bf4\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_10ba21a923726f8f82d16aa21b1\``);
        await queryRunner.query(`ALTER TABLE \`solicitudes\` DROP FOREIGN KEY \`FK_8647c62a4fb649befc52fc26622\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_db3e19d66ecb49bfca80fa998f2\``);
        await queryRunner.query(`ALTER TABLE \`perfiles_maestro\` DROP FOREIGN KEY \`FK_196b787c380a70a6765e93b3e7d\``);
        await queryRunner.query(`DROP INDEX \`IDX_d51e1eba406cb63069c4dfb0e7\` ON \`solicitud_areas\``);
        await queryRunner.query(`DROP INDEX \`IDX_9916dd0c25d0acd59f5f6e20ab\` ON \`solicitud_areas\``);
        await queryRunner.query(`DROP TABLE \`solicitud_areas\``);
        await queryRunner.query(`DROP INDEX \`IDX_d6ca81187625a7aea1f1a83c51\` ON \`maestro_areas\``);
        await queryRunner.query(`DROP INDEX \`IDX_8b1534436c631c37007b0c5282\` ON \`maestro_areas\``);
        await queryRunner.query(`DROP TABLE \`maestro_areas\``);
        await queryRunner.query(`DROP INDEX \`REL_cc4f45f1b9a69da1b063218d7f\` ON \`resenas\``);
        await queryRunner.query(`DROP INDEX \`idx_resenas_maestro\` ON \`resenas\``);
        await queryRunner.query(`DROP TABLE \`resenas\``);
        await queryRunner.query(`DROP INDEX \`IDX_f572c2950caef99a68cc74baa7\` ON \`pagos\``);
        await queryRunner.query(`DROP INDEX \`IDX_82f3e0738f34c48ea8b8a5ccb7\` ON \`pagos\``);
        await queryRunner.query(`DROP INDEX \`idx_pagos_maestro\` ON \`pagos\``);
        await queryRunner.query(`DROP TABLE \`pagos\``);
        await queryRunner.query(`DROP TABLE \`paquetes_credito\``);
        await queryRunner.query(`DROP INDEX \`uq_notificacion_solicitud_maestro_canal\` ON \`notificaciones_solicitud\``);
        await queryRunner.query(`DROP INDEX \`idx_notificaciones_maestro\` ON \`notificaciones_solicitud\``);
        await queryRunner.query(`DROP TABLE \`notificaciones_solicitud\``);
        await queryRunner.query(`DROP INDEX \`idx_movimientos_maestro\` ON \`movimientos_credito\``);
        await queryRunner.query(`DROP INDEX \`uq_movimiento_referencia\` ON \`movimientos_credito\``);
        await queryRunner.query(`DROP TABLE \`movimientos_credito\``);
        await queryRunner.query(`DROP INDEX \`IDX_203800e4ffabef372109270fc9\` ON \`mensajes_whatsapp\``);
        await queryRunner.query(`DROP INDEX \`idx_mensajes_celular\` ON \`mensajes_whatsapp\``);
        await queryRunner.query(`DROP TABLE \`mensajes_whatsapp\``);
        await queryRunner.query(`DROP INDEX \`idx_documentos_maestro\` ON \`documentos_maestro\``);
        await queryRunner.query(`DROP TABLE \`documentos_maestro\``);
        await queryRunner.query(`DROP INDEX \`uq_cotizacion_solicitud_maestro\` ON \`cotizaciones\``);
        await queryRunner.query(`DROP INDEX \`idx_cotizaciones_maestro\` ON \`cotizaciones\``);
        await queryRunner.query(`DROP TABLE \`cotizaciones\``);
        await queryRunner.query(`DROP INDEX \`IDX_5ed7d54ad273dbe4f709830d52\` ON \`solicitudes\``);
        await queryRunner.query(`DROP INDEX \`idx_solicitudes_estado\` ON \`solicitudes\``);
        await queryRunner.query(`DROP INDEX \`idx_solicitudes_cliente\` ON \`solicitudes\``);
        await queryRunner.query(`DROP TABLE \`solicitudes\``);
        await queryRunner.query(`DROP INDEX \`IDX_63665765c1a778a770c9bd585d\` ON \`usuarios\``);
        await queryRunner.query(`DROP INDEX \`IDX_26195374e7857343c57a1080ce\` ON \`usuarios\``);
        await queryRunner.query(`DROP TABLE \`usuarios\``);
        await queryRunner.query(`DROP TABLE \`perfiles_maestro\``);
        await queryRunner.query(`DROP INDEX \`idx_codigos_otp_celular\` ON \`codigos_otp\``);
        await queryRunner.query(`DROP TABLE \`codigos_otp\``);
        await queryRunner.query(`DROP INDEX \`uq_barrios_ciudad_nombre\` ON \`barrios\``);
        await queryRunner.query(`DROP TABLE \`barrios\``);
        await queryRunner.query(`DROP INDEX \`IDX_b7c3c95e1c6dfe264ba33bf482\` ON \`areas\``);
        await queryRunner.query(`DROP TABLE \`areas\``);
    }

}
