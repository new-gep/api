import {ConfigModule} from "@nestjs/config";
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientModule } from './client/client.module';
import { CollaboratorModule } from './collaborator/collaborator.module';
import { CompanyModule } from './company/company.module';
import { UserModule } from './user/user.module';
import { EmailService } from "./email/email.service";
import { UserTypeModule } from './user_type/user_type.module';

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ['.env.development.local', '.env.development'],}), ClientModule, CollaboratorModule, CompanyModule, UserModule, UserTypeModule ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})

export class AppModule {}
