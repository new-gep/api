import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { paymentProviders } from './payment.provider';
import { DatabaseModule } from 'src/database/database.module';
@Module({
  imports:[DatabaseModule],
  controllers: [PaymentController, ],
  providers: [PaymentService, ...paymentProviders],
  exports: [PaymentService],
})
export class PaymentModule {}
