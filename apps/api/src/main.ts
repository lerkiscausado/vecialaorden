import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de un proxy (Railway, Render, Nginx…) para leer la IP real del visitante.
  // Sin esto, el límite de peticiones contaría a todos como un mismo visitante.
  const proxy = process.env.TRUST_PROXY?.trim();
  if (proxy) app.set('trust proxy', /^\d+$/.test(proxy) ? Number(proxy) : proxy === 'true' ? true : proxy);

  const origenes = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // credentials: la cookie de renovación viaja entre la web y el API.
  app.enableCors({ origin: origenes, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Muestra el primer mensaje de cada campo, que ya está en español.
      stopAtFirstError: true,
    }),
  );
  app.enableShutdownHooks();

  const puerto = Number(process.env.PORT ?? 3001);
  await app.listen(puerto);
  Logger.log(`API de Veci a la Orden escuchando en http://localhost:${puerto}`, 'Bootstrap');
}

bootstrap();
