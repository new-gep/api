import { Module } from '@nestjs/common';
import { CardCompanyService } from './card_company.service';
import { CardCompanyController } from './card_company.controller';
import { DatabaseModule } from 'src/database/database.module';
import { cardCompanyProviders } from './card_company.provider';


@Module({
  imports: [DatabaseModule],
  controllers: [CardCompanyController],
  providers: [CardCompanyService, ...cardCompanyProviders],
})
export class CardCompanyModule {}
