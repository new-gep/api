import { DataSource } from 'typeorm';
import { UserType } from './entities/user_type.entity'

export const usertypeProviders = [
  {
    provide: 'USERTYPE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UserType),
    inject: ['DATA_SOURCE'],
  },
];