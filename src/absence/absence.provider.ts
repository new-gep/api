import { DataSource } from 'typeorm';
import { Absence } from './entities/absence.entity';

export const absenceProviders = [
  {
    provide: 'ABSENCE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Absence),
    inject: ['DATA_SOURCE'],
  },
];