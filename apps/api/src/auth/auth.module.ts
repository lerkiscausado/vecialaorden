import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditosModule } from '../creditos/creditos.module';
import { CodigoOtp } from '../database/entities';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { OtpService } from './otp.service';
import { SesionesService } from './sesiones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CodigoOtp]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    WhatsappModule,
    CreditosModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SesionesService, { provide: APP_GUARD, useClass: JwtGuard }],
  exports: [AuthService, SesionesService],
})
export class AuthModule {}
