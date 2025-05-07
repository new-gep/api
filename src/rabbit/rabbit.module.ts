import { Module } from '@nestjs/common';
import { RabbitProvider } from './rabbit.provider';

@Module({
  providers: [RabbitProvider],
  exports: [RabbitProvider],
})

export class RabbitModule {}