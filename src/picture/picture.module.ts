import { Module } from '@nestjs/common';
import { PictureService } from './picture.service';
import { PictureController } from './picture.controller';
import { DatabaseModule } from 'src/database/database.module';
import { pictureProviders } from './picture.provider';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';

@Module({
  imports:[DatabaseModule, CollaboratorModule],
  controllers: [PictureController],
  providers: [PictureService, ...pictureProviders],
})
export class PictureModule {}
