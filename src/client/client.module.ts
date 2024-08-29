import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { DatabaseModule } from 'src/database/database.module';
import { clientProviders } from './client.provider';

@Module({
  imports:[DatabaseModule],
  controllers: [ClientController],
  providers: [ClientService, ...clientProviders],
})
export class ClientModule {}
