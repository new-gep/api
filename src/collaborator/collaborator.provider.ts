import { DataSource } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity'

export const collaboratorProviders = [
  {
    provide: 'COLLABORATOR_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Collaborator),
    inject: ['DATA_SOURCE'],
  },
];