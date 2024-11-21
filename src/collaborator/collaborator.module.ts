import { Module } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { CollaboratorController } from './collaborator.controller';
import { DatabaseModule } from 'src/database/database.module';
import { collaboratorProviders } from './collaborator.provider';
import { EmailModule } from 'src/email/email.module';
import { BucketModule } from 'src/bucket/bucket.module';

@Module({
  imports:[DatabaseModule, EmailModule, BucketModule],
  controllers: [CollaboratorController],
  providers: [CollaboratorService, ...collaboratorProviders],
  exports: [CollaboratorService]
})
export class CollaboratorModule {}
