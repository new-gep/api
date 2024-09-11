import { DataSource } from 'typeorm';
import { Picture } from './entities/picture.entity'

export const pictureProviders = [
  {
    provide: 'PICTURE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Picture),
    inject: ['DATA_SOURCE'],
  },
];