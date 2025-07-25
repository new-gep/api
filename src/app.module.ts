import {ConfigModule} from "@nestjs/config";
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollaboratorModule } from './collaborator/collaborator.module';
import { CompanyModule } from './company/company.module';
import { UserModule } from './user/user.module';
import { EmailService } from "./email/email.service";
import { PictureModule } from './picture/picture.module';
import { JobModule } from './job/job.module';
import { CardCompanyModule } from './card_company/card_company.module';
import { AbsenceModule } from './absence/absence.module';
import { ServiceModule } from './service/service.module';
import { LeadModule } from './lead/lead.module';
import { RedisModule } from './redis/redis.module';
import { PaymentModule } from './payment/payment.module';
import { AssistantModule } from './assistant/assistant.module';
import { SignatureModule } from './signature/signature.module';
import { CvModule } from './cv/cv.module';
import { AnnouncementModule } from './announcement/announcement.module';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ['.env.development.local', '.env.development'],}), CollaboratorModule, CompanyModule, UserModule, PictureModule, JobModule, CardCompanyModule, AbsenceModule, ServiceModule, LeadModule, RedisModule, PaymentModule, AssistantModule, SignatureModule, CvModule, AnnouncementModule ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})

export class AppModule {}
