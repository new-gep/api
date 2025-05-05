import { Module } from '@nestjs/common';
import { SignatureService } from './signature.service';
import { SignatureController } from './signature.controller';
import { DatabaseModule } from 'src/database/database.module';
import { signatureProviders } from './signature.provider';

@Module({
  controllers: [SignatureController],
  providers: [SignatureService, ...signatureProviders],
  imports: [DatabaseModule]
})
export class SignatureModule {}
