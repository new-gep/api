import { Module, forwardRef } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BucketModule } from 'src/bucket/bucket.module';
import { serviceProviders } from './service.provider';
import { JobModule } from 'src/job/job.module';

@Module({
  imports: [DatabaseModule, BucketModule ],
  controllers: [ServiceController],
  providers: [ServiceService, ...serviceProviders],
  exports: [ServiceService],
})
export class ServiceModule {}
