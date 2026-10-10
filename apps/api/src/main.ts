import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origenes = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenes });

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
