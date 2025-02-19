import { DataSource } from 'typeorm';
import { Service } from './entities/service.entity';

export const serviceProviders = [
  {
    provide: 'SERVICE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Service),
    inject: ['DATA_SOURCE'],
  },
];