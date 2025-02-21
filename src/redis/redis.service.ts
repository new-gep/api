import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CreateRediDto } from './dto/create-redi.dto';
import { UpdateRediDto } from './dto/update-redi.dto';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;
  constructor() {
    this.client = createClient({
      url: 'redis://localhost:6379', // ajuste a URL e a porta conforme sua configuração
    });
    
    this.client.connect().catch(console.error);
  }

  create(createRediDto: CreateRediDto) {
    return 'This action adds a new redi';
  }

  findAll() {
    return `This action returns all redis`;
  }

  findOne(id: number) {
    return `This action returns a #${id} redi`;
  }

  update(id: number, updateRediDto: UpdateRediDto) {
    return `This action updates a #${id} redi`;
  }

  remove(id: number) {
    return `This action removes a #${id} redi`;
  }

  onModuleDestroy() {
    // Adicione aqui a lógica que você deseja executar quando o módulo for destruído
    console.log('Redis service is being destroyed');
  }
}
