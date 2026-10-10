import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MaestrosController } from './maestros.controller';

@Module({
  imports: [AuthModule],
  controllers: [MaestrosController],
})
export class MaestrosModule {}
