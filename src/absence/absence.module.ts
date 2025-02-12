import { Module } from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { absenceProviders } from './absence.provider';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AbsenceController],
  providers: [AbsenceService, ...absenceProviders],
})
export class AbsenceModule {}
