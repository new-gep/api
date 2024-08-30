import { Inject, Injectable } from '@nestjs/common';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { Repository   } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { EmailService } from 'src/email/email.service';
import FindTimeSP from 'hooks/time';
@Injectable()
export class CollaboratorService {
  constructor(
    @Inject('COLLABORATOR_REPOSITORY') 
    private collaboratorRepository: Repository<Collaborator>,
    private readonly emailService : EmailService
  ){}
  
  async create(createCollaboratorDto: CreateCollaboratorDto) {
    
    const existingCPFCollaborator   = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.cpf }
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.phone }
    });
    const existingEmailCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.email }
    });

    if (existingCPFCollaborator) {
      return {
        status:409,
        message:'CPF já existe.',
      }
    };

    if (existingPhoneCollaborator) {
      return {
        status:409,
        message:'Celular já existe.',
      }
    };

    if (existingEmailCollaborator) {
      return {
        status:409,
        message:'E-mail já existe.',
      }
    };
    
    const time = FindTimeSP();
    createCollaboratorDto.create_at = time

    const newCollaborator = await this.collaboratorRepository.save(createCollaboratorDto);
    if(newCollaborator){
      return {
        status :201,
        message:'Colaborador criado com sucesso! ',
      }
    }
  }

  async checkCollaborator(createCollaboratorDto: CreateCollaboratorDto){
    const existingCPFCollaborator   = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.cpf }
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.phone }
    });
    const existingEmailCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.email }
    });

    if (existingCPFCollaborator) {
      return {
        status:409,
        message:'CPF já existe.',
      }
    };

    if (existingPhoneCollaborator) {
      return {
        status:409,
        message:'Celular já existe.',
      }
    };

    if (existingEmailCollaborator) {
      return {
        status:409,
        message:'E-mail já existe.',
      }
    };

    return await this.emailService.sendCode(createCollaboratorDto.email)

  }

  async resendCodeEmail(email:string){
    return await this.emailService.sendCode(email)
  }

  findAll() {
    return `This action returns all collaborator`;
  }

  async findOne(CPF: string) {
    const response = await this.collaboratorRepository.findOne({ where: { CPF } });
    if(response){
      return {
        status:200,
        collaborator:response
      }
    }
    return {
      status :409,
      message:'Registro não encontrado'
    }
  }

  update(id: number, updateCollaboratorDto: UpdateCollaboratorDto) {
    return `This action updates a #${id} collaborator`;
  }

  remove(id: number) {
    return `This action removes a #${id} collaborator`;
  }
}
