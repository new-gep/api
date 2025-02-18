import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { DatabaseModule } from 'src/database/database.module';
import { jobProviders } from './job.provider';
import { UserModule } from 'src/user/user.module';
import { CollaboratorModule } from 'src/collaborator/collaborator.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { CompanyModule } from 'src/company/company.module';
import { AbsenceModule } from 'src/absence/absence.module';
@Module({
  imports:[DatabaseModule, UserModule, CollaboratorModule, BucketModule, CompanyModule, AbsenceModule],
  controllers: [JobController],
  providers: [JobService, ...jobProviders],
})
export class JobModule {}
