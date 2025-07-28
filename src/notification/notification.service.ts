import { Inject, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { IsNull, Repository } from 'typeorm';
import findTimeSP from 'hooks/time';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_REPOSITORY')
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    try {
      await this.notificationRepository.save(createNotificationDto);

      return {
        status: 201,
        message: `Notificação criada com sucesso.`,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: e,
      };
    }
  }

  findAll() {
    return `This action returns all notification`;
  }

  async findOne(cpf: any) {
    try {
      const response = await this.notificationRepository.find({
        where: {
          CPF_collaborator: {
            CPF: cpf,
          },
          delete_at: IsNull(),
        },
      });

      if (!response) {
        return {
          status: 409,
          message: 'Registro não encontrado',
        };
      }

      return {
        status: 200,
        data: response,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        error: e,
      };
    }
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  async remove(id: number) {
    try {
      const time = findTimeSP();

      const propsDelete = {
        delete_at: time,
      };

      const response = await this.notificationRepository.update(
        id,
        propsDelete,
      );

      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Notificação deletado com sucesso!',
        };
      }

      return {
        status: 404,
        message: 'Não foi possivel deletar a notificação, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }
}
