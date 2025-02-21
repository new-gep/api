import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CreateRediDto } from './dto/create-redi.dto';
import { UpdateRediDto } from './dto/update-redi.dto';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;

  // constructor() {
  //   this.client = createClient({
  //     url: 'redis://localhost:6379', // ajuste a URL e a porta conforme sua configuração
  //   });

  //   this.client.connect()
  //     .then(() => console.log('✅ Conectado ao Redis!'))
  //     .catch(console.error);
  // }

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

  async set(key: string, value: any, ttl?: number): Promise<string> {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl, data);
    } else {
      await this.client.set(key, data);
    }
    return '✅ Valor salvo no Redis';
  }

  async get(key: string): Promise<any> {
    const data = await this.client.get(key);
    return JSON.parse(data);
  }

  async delete(key: string): Promise<string> {
    await this.client.del(key);
    return '✅ Valor deletado no Redis';
  }

  onModuleDestroy() {
    // Adicione aqui a lógica que você deseja executar quando o módulo for destruído
    if (this.client) {
      this.client.quit()
        .then(() => console.log('Redis client disconnected'))
        .catch(console.error);
    }
  }
}
