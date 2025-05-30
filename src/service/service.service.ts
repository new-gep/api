import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import findTimeSP from 'hooks/time';
import { BucketService } from '../bucket/bucket.service';
import { IsNull } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SignatureServiceDto } from './dto/signature-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    @Inject('SERVICE_REPOSITORY')
    private serviceRepository: Repository<Service>,
    private bucketService: BucketService,
  
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    try {
      // console.log("createServiceDto", createServiceDto);
      const time = findTimeSP();
      createServiceDto.name = `${createServiceDto.name}`;
      createServiceDto.status = 'Pending';
      createServiceDto.create_at = time;


      // console.log('createServiceDto após modificações:', createServiceDto);
      // return;
      const newService = await this.serviceRepository.save(createServiceDto);

      if (newService) {
        return {
          status: 201,
          message: 'successfully created service',
          service: newService,
        };
      } else {
        return {
          status: 500,
          message: 'something went wrong, please try again later.',
        };
      }
    } catch (e) {
      console.log('Erro capturado:', e);
      return {
        status: 500,
        message: 'internal error, please try again later.',
      };
    }
  }

  async UploadJobFileSignature(signatureServiceDto: SignatureServiceDto, file: Express.Multer.File) {
    return this.bucketService.uploadServiceFileSignature(
      file, 
      signatureServiceDto.name,
      signatureServiceDto.type,
      signatureServiceDto.id_work,
    );
  }

  async uploadFile(updateServiceDto: UpdateServiceDto, file: Express.Multer.File) {
    return await this.bucketService.uploadService(
      file,
      updateServiceDto.name,
      updateServiceDto.type,
      updateServiceDto.status,
      updateServiceDto.id_work,
      updateServiceDto?.dynamic,
    );
  }

  async findAll() {
    try {
      const response = await this.serviceRepository.find({
        where: { delete_at: IsNull() },
      });

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

  async FindAllByMonthAndYear(cnpj: string, month: string, year: string, type: string) {
    try {
      const response = await this.serviceRepository.find({
        where: {type: type, delete_at: IsNull()},
      });

      if(response.length > 0){
        return {
          status: 200, 
          services: response
        };
      }

      return {
        status: 404,
        message: 'Nenhum registro encontrado',
      };
    } catch (error) {
      console.log("error", error);
      return;
    }
  }

  async findOne(id: number) {
    // console.log("id", id);
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
      console.log("response findOne", response);
      return;
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
    Object.keys(updateServiceDto).forEach((key) => {
      if (updateServiceDto[key] === undefined || updateServiceDto[key] === null) {
        delete updateServiceDto[key];
      }
    });
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
