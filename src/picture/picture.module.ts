import { Module } from '@nestjs/common';
import { PictureService } from './picture.service';
import { PictureController } from './picture.controller';
import { DatabaseModule } from 'src/database/database.module';
import { pictureProviders } from './picture.provider';

@Module({
  imports:[DatabaseModule],
  controllers: [PictureController],
  providers: [PictureService, ...pictureProviders],
})
export class PictureModule {}
