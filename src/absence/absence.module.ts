import { Module } from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { absenceProviders } from './absence.provider';
import { DatabaseModule } from 'src/database/database.module';
import { BucketModule } from 'src/bucket/bucket.module';
@Module({
  imports: [DatabaseModule, BucketModule],
  controllers: [AbsenceController],
  providers: [AbsenceService, ...absenceProviders],
  exports: [AbsenceService],
})
export class AbsenceModule {}
