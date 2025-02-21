import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { DatabaseModule } from 'src/database/database.module';
import { companyProviders } from './company.provider';
import { UserModule } from 'src/user/user.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { RedisModule } from 'src/redis/redis.module';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
@Module({
  imports:[DatabaseModule, UserModule, BucketModule, RedisModule, CollaboratorModule],
  controllers: [CompanyController],
  providers: [CompanyService, ...companyProviders],
  exports: [CompanyService]
})
export class CompanyModule {}
