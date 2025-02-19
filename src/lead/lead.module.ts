import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { leadProviders } from './lead.provider';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LeadController],
  providers: [LeadService, ...leadProviders],
  exports: [LeadService],
})
export class LeadModule {}
