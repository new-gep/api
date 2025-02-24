import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { DatabaseModule } from 'src/database/database.module';
import { companyProviders } from './company.provider';
import { UserModule } from 'src/user/user.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { RedisModule } from 'src/redis/redis.module';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { ServiceModule } from 'src/service/service.module';
import { EmailModule } from 'src/email/email.module';
@Module({
  imports:[DatabaseModule, UserModule, BucketModule, RedisModule, CollaboratorModule, ServiceModule, EmailModule],
  controllers: [CompanyController],
  providers: [CompanyService, ...companyProviders],
  exports: [CompanyService]
})
export class CompanyModule {}
