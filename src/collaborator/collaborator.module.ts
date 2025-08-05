import { forwardRef, Module } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { CollaboratorController } from './collaborator.controller';
import { DatabaseModule } from 'src/database/database.module';
import { collaboratorProviders } from './collaborator.provider';
import { EmailModule } from 'src/email/email.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { CvModule } from 'src/cv/cv.module';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports:[DatabaseModule, FirebaseModule,EmailModule, BucketModule, forwardRef(() => CvModule)],
  controllers: [CollaboratorController],
  providers: [CollaboratorService, ...collaboratorProviders],
  exports: [CollaboratorService]
})
export class CollaboratorModule {}
