import { DataSource } from 'typeorm';
import { Cv } from './entities/cv.entity'

export const cvProviders = [
  {
    provide: 'CV_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Cv),
    inject: ['DATA_SOURCE'],
  },
];