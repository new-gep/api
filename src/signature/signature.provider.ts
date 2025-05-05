import { DataSource } from 'typeorm';
import { Signature } from './entities/signature.entity'

export const signatureProviders = [
  {
    provide: 'SIGNATURE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Signature),
    inject: ['DATA_SOURCE'],
  },
];