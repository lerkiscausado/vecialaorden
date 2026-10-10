import { Module } from '@nestjs/common';
import { CreditosModule } from '../creditos/creditos.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CreditosModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
