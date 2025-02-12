import { Inject, Injectable } from '@nestjs/common';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { Absence } from './entities/absence.entity';
import { Repository } from 'typeorm';
import findTimeSP from 'hooks/time';

@Injectable()
export class AbsenceService {
  constructor(
    @Inject('ABSENCE_REPOSITORY')
    private absenceRepository: Repository<Absence>
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

  findAll() {
    return `This action returns all absence`;
  }

  findOne(id: number) {
    return `This action returns a #${id} absence`;
  }

  update(id: number, updateAbsenceDto: UpdateAbsenceDto) {
    return `This action updates a #${id} absence`;
  }

  remove(id: number) {
    return `This action removes a #${id} absence`;
  }
}
