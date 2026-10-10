import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth/auth.module';
import { CatalogoController } from './catalogo/catalogo.controller';
import { validarEnv } from './config/validar-env';
import { CreditosModule } from './creditos/creditos.module';
import { IaModule } from './ia/ia.module';
import { opcionesBaseDeDatos } from './database/opciones';
import { forzarUtc } from './database/utc';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validarEnv }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...opcionesBaseDeDatos(process.env), migrationsRun: false }),
      dataSourceFactory: async (opciones) => forzarUtc(await new DataSource(opciones!).initialize()),
    }),
    // Límite general: 100 peticiones por minuto por IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    CreditosModule,
    IaModule,
  ],
  controllers: [CatalogoController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
