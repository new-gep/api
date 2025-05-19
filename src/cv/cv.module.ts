import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { DatabaseModule } from 'src/database/database.module';
import { cvProviders } from './cv.provider';

@Module({
  imports: [DatabaseModule, CollaboratorModule],
  controllers: [CvController],
  providers: [CvService, ...cvProviders],
  exports: [CvService],
})
export class CvModule {}
