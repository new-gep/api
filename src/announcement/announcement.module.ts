import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { announcementProviders } from './announcement.provider';

@Module({
  imports: [DatabaseModule, BucketModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, ...announcementProviders],
})
export class AnnouncementModule {}
