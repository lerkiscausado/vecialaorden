import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditosModule } from '../creditos/creditos.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CreditosModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
