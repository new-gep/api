import { DataSource } from 'typeorm';
import { Lead } from './entities/lead.entity'

export const leadProviders = [
  {
    provide: 'LEAD_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Lead),
    inject: ['DATA_SOURCE'],
  },
];