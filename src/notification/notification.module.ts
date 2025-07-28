import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { notificationProviders } from './notification.provider';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule], 
  controllers: [NotificationController],
  providers: [NotificationService, ...notificationProviders],
  exports: [NotificationService]
})
export class NotificationModule {}
