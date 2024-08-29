import { Module } from '@nestjs/common';
import { UserTypeService } from './user_type.service';
import { UserTypeController } from './user_type.controller';
import { DatabaseModule } from 'src/database/database.module';
import { usertypeProviders } from './user_type.provider';


@Module({
  imports:[DatabaseModule],
  controllers: [UserTypeController],
  providers: [UserTypeService, ...usertypeProviders],
})
export class UserTypeModule {}
