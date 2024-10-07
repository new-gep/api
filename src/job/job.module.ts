import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { DatabaseModule } from 'src/database/database.module';
import { jobProviders } from './job.provider';

@Module({
  imports:[DatabaseModule],
  controllers: [JobController],
  providers: [JobService, ...jobProviders],
})
export class JobModule {}
