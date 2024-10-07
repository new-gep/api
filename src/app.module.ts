import {ConfigModule} from "@nestjs/config";
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollaboratorModule } from './collaborator/collaborator.module';
import { CompanyModule } from './company/company.module';
import { UserModule } from './user/user.module';
import { EmailService } from "./email/email.service";
import { UserTypeModule } from './user_type/user_type.module';
import { PictureModule } from './picture/picture.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ['.env.development.local', '.env.development'],}), CollaboratorModule, CompanyModule, UserModule, UserTypeModule, PictureModule, JobModule ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})

export class AppModule {}
