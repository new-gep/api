import { Inject, Injectable } from '@nestjs/common';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { Absence } from './entities/absence.entity';
import { Repository } from 'typeorm';
import findTimeSP from 'hooks/time';
import { BucketService } from '../bucket/bucket.service';
import { IsNull } from 'typeorm';
import { UploadAbsenceDto } from './dto/upload-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Injectable()
export class AbsenceService {
  constructor(
    @Inject('ABSENCE_REPOSITORY')
    private absenceRepository: Repository<Absence>,
    private bucketService: BucketService,
  ) {}
  
  create(createAbsenceDto: CreateAbsenceDto) {
    try {
      const time = findTimeSP();
      createAbsenceDto.create_at = time;

      const newAbsence = this.absenceRepository.save(createAbsenceDto);

      if (newAbsence) {
        return {
          status: 201,
          message: 'Justificativa criada.',
        };
      } else {
        return {
          status: 500,
          message: 'Algo deu errado, tente mais tarde.',
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

  async uploadFile(upadteAbsenceDto: UploadAbsenceDto, file: Express.Multer.File) {
    return await this.bucketService.uploadService(
      file,
      upadteAbsenceDto.id_work,
      'Absence',
      upadteAbsenceDto.year,
      upadteAbsenceDto.month,
      upadteAbsenceDto.name,
    );
  }

  async findAll() {
    try {
      const response = await this.absenceRepository.find({
        where: { delete_at: IsNull() },
      });

      if (response) {
        return {
          status: 200,
          absences: response,
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
    try {
      const response = await this.absenceRepository.findOne({
        where: { id: id.toString() },
      });
      
      if (response) {
        return {
          status: 200,
          absence: response,
        };
      } else {
        return {
          status: 404,
          message: 'Justificativa não encontrada',
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

      const response = await this.absenceRepository.update(id, propsDelete);
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

  async update(id: number, updateAbsenceDto: UpdateAbsenceDto) {
    const time = findTimeSP();
    updateAbsenceDto.update_at = time;
    
    try {   
      const response = await this.absenceRepository.update(id, updateAbsenceDto);
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Justificativa atualizada com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possível atualizar a justificativa, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }
  


  // async uploadFile(id: number, file: Express.Multer.File) {
  //   return await this.bucketService.uploadAbsence(file, id);
  // }

  // async findFile(id: number) {
  //   return await this.bucketService.findAbsence(id);
  // }
}
