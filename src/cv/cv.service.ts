import { Inject, Injectable } from '@nestjs/common';
import { CreateCvDto } from './dto/create-cv.dto';
import { UpdateCvDto } from './dto/update-cv.dto';
import { Repository } from 'typeorm';
import { Cv } from 'src/cv/entities/cv.entity';
import { CollaboratorService } from 'src/collaborator/collaborator.service';

@Injectable()
export class CvService {
  constructor(
      @Inject('CV_REPOSITORY')
      private CVRepository: Repository<Cv>,
      readonly collaboratorService: CollaboratorService,
    ) {}
    
  create(createCvDto: CreateCvDto) {
    return 'This action adds a new cv';
  }

  findAll() {
    return `This action returns all cv`;
  }

  async findOne(cpf: string) {
    const cv = await this.CVRepository.findOne({
      where: { CPF_collaborator: { CPF: cpf } },
      relations: { CPF_collaborator: true },
    });
    if(cv){
      return {cv:cv, status:200, message:"success"};
    }
    const collaborator = await this.collaboratorService.findOne(cpf);
    if(!collaborator){
      return {status:404, message:"collaborator not found"};
    }

    return {status:200, message:"success", collaborator:collaborator};

  }

  update(id: number, updateCvDto: UpdateCvDto) {
    return `This action updates a #${id} cv`;
  }

  remove(id: number) {
    return `This action removes a #${id} cv`;
  }
}
