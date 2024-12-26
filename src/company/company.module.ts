import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { DatabaseModule } from 'src/database/database.module';
import { companyProviders } from './company.provider';
import { UserModule } from 'src/user/user.module';
import { BucketModule } from 'src/bucket/bucket.module';

@Module({
  imports:[DatabaseModule, UserModule, BucketModule],
  controllers: [CompanyController],
  providers: [CompanyService, ...companyProviders],
})
export class CompanyModule {}
