// rabbitmq.provider.ts
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export const RabbitProvider = {
  provide: 'RABBITMQ_SERVICE',
  useFactory: () => {
    return ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'my_queue',
        queueOptions: {
          durable: false,
        },
      },
    });
  },
};
