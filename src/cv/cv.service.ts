import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateCvDto } from './dto/create-cv.dto';
import { UpdateCvDto } from './dto/update-cv.dto';
import { Repository } from 'typeorm';
import { Cv } from 'src/cv/entities/cv.entity';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
import findTimeSP from 'hooks/time';

@Injectable()
export class CvService {
  constructor(
    @Inject('CV_REPOSITORY')
    private CVRepository: Repository<Cv>,
    
    @Inject(forwardRef(() => CollaboratorService))
    readonly collaboratorService: CollaboratorService,
  ) {}

  async create(createCvDto: CreateCvDto) {
    createCvDto.create_at = findTimeSP();
    const cv = await this.CVRepository.save(createCvDto);
    if (cv) {
      return {
        status: 201,
        message: 'Created successfully',
        cv: cv,
      };
    }

    return {
      status: 500,
      message: 'Internal server error',
    };
  }

  findAll() {
    return `This action returns all cv`;
  }

  async findOne(cpf: string) {
    const cv = await this.CVRepository.findOne({
      where: { CPF_collaborator: { CPF: cpf } },
      relations: { CPF_collaborator: true },
    });
    if (cv) {
      cv.education  = JSON.parse(cv.education);
      cv.experience = JSON.parse(cv.experience);
      cv.skills     = JSON.parse(cv.skills);
      return { cv: cv, status: 200, message: 'success' };
    }
    const collaborator = await this.collaboratorService.findOne(cpf);
    if (!collaborator) {
      return { status: 404, message: 'collaborator not found' };
    }
    return { status: 200, message: 'success', collaborator: collaborator };
  }

  async update(id: number, updateCvDto: UpdateCvDto) {
    updateCvDto.update_at = findTimeSP()
    const response = await this.CVRepository.update(id, updateCvDto);
    if (response.affected === 0) {
      return {
        status: 404,
        message: 'cv not found',
      };
    } 
    if (response.affected === 1) {
      return {
        status: 200,
        message: 'cv updated successfully',
      };
    }
  }

  remove(id: number) {
    return `This action removes a #${id} cv`;
  }
}
