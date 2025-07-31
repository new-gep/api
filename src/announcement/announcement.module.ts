import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { announcementProviders } from './announcement.provider';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [DatabaseModule, BucketModule, CollaboratorModule, FirebaseModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, ...announcementProviders],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
