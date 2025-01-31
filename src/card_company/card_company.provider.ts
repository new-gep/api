import { DataSource } from 'typeorm';
import { CardCompany } from './entities/card_company.entity';

export const cardCompanyProviders = [
  {
    provide: 'CARD_COMPANY_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(CardCompany),
    inject: ['DATA_SOURCE'],
  },
]; 