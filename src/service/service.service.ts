import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import findTimeSP from 'hooks/time';
import { BucketService } from '../bucket/bucket.service';
import { IsNull } from 'typeorm';
import { Express } from 'express';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    @Inject('SERVICE_REPOSITORY')
    private serviceRepository: Repository<Service>,
    private bucketService: BucketService,
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    try {
      const time = findTimeSP();

      createServiceDto.id_work = createServiceDto.id_work;
      createServiceDto.name = `${createServiceDto.name}`;
      createServiceDto.type = null;
      createServiceDto.status = 'Pending';
      createServiceDto.create_at = time;

      console.log('createServiceDto após modificações:', createServiceDto);

      const newService = await this.serviceRepository.save(createServiceDto);
      console.log('newService após save:', newService);

      if (newService) {
        console.log('Retornando sucesso com:', {
          status: 201,
          message: 'Justificativa criada.',
          service: newService,
        });
        return {
          status: 201,
          message: 'Justificativa criada.',
          service: newService,
        };
      } else {
        console.log('newService é null/undefined');
        return {
          status: 500,
          message: 'Algo deu errado, tente mais tarde.',
        };
      }
    } catch (e) {
      console.log('Erro capturado:', e);
      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  }

  // async uploadFile(upadteAbsenceDto: UploadAbsenceDto, file: Express.Multer.File) {
  //   return await this.bucketService.uploadService(
  //     file,
  //     upadteAbsenceDto.id_work,
  //     'Absence',
  //     upadteAbsenceDto.year,
  //     upadteAbsenceDto.month,
  //     upadteAbsenceDto.name,
  //   );
  // }

  async findAll() {
    try {
      const response = await this.serviceRepository.find({
        where: { delete_at: IsNull() },
      });

      // console.log(response);
      // return;
      if (response) {
        return {
          status: 200,
          services: response,
        };
      }
      return {
        status: 409,
        message: 'Registro não encontrado',
      };
    } catch (error) {
      return {
        status: 500,
        message: 'Erro no servidor',
      };
    }
  }

  async findOne(id: number) {
    // console.log(id);
    // return;
    if (id === null || id === undefined) {
      return {
        status: 400,
        message: 'ID inválido',
      };
    }

    try {
      const response = await this.serviceRepository.findOne({
        where: { id: String(id) }, // Conversão mais segura
      });

      if (response) {
        return {
          status: 200,
          service: response,
        };
      } else {
        return {
          status: 404,
          message: 'Serviço não encontrado',
        };
      }
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  }

  async remove(id: number) {
    try {
      const time = findTimeSP();

      const propsDelete = {
        delete_at: time,
      };

      const response = await this.serviceRepository.update(id, propsDelete);
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Justificativa deletada com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possível deletar a justificativa, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async update(id: number, updateServiceDto: UpdateServiceDto) {
    const time = findTimeSP();
    updateServiceDto.update_at = time;

    try {
      const response = await this.serviceRepository.update(
        id,
        updateServiceDto,
      );
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Serviço atualizado com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possível atualizar o serviço, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async UploadJobFileAbsence(
    file: Express.Multer.File,
    name: string,
    year: string,
    month: string,
    id_work: string,
    type: string,
  ) {
    return await this.bucketService.uploadService(
      file,
      id_work,
      'Service',
      year,
      month,
      name,
    );
  }
}
