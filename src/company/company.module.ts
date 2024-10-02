import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { DatabaseModule } from 'src/database/database.module';
import { companyProviders } from './company.provider';
import { UserModule } from 'src/user/user.module';

@Module({
  imports:[DatabaseModule, UserModule],
  controllers: [CompanyController],
  providers: [CompanyService, ...companyProviders],
})
export class CompanyModule {}
