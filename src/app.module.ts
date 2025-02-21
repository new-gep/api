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
import { CardCompanyModule } from './card_company/card_company.module';
import { AbsenceModule } from './absence/absence.module';
import { ServiceModule } from './service/service.module';
import { LeadModule } from './lead/lead.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ['.env.development.local', '.env.development'],}), CollaboratorModule, CompanyModule, UserModule, UserTypeModule, PictureModule, JobModule, CardCompanyModule, AbsenceModule, ServiceModule, LeadModule, RedisModule ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})

export class AppModule {}
