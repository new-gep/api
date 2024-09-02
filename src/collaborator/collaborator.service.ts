import { Inject, Injectable } from '@nestjs/common';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { SingInCollaboratorDto } from './dto/auth/singIn.dto';
import { Repository   } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { EmailService } from 'src/email/email.service';
import * as bcrypt from 'bcrypt';
import FindTimeSP from 'hooks/time';
@Injectable()
export class CollaboratorService {
  constructor(
    @Inject('COLLABORATOR_REPOSITORY') 
    private collaboratorRepository: Repository<Collaborator>,
    private readonly emailService : EmailService
  ){}

  async singIn(singInCollaboratorDto: SingInCollaboratorDto) {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { CPF: singInCollaboratorDto.cpf }
    });
    if (!collaborator) {
      return {
        status:409,
        message:'Acesso incorreto',
      }
    };
    const auth = await bcrypt.compare(singInCollaboratorDto.password, collaborator.password);
    switch(auth){
      case true:
        return {
          status : 200,
          message: 'Acesso liberado',
          collaborator: collaborator
        }
      case false:
        return {
          status : 409,
          message: 'Acesso incorreto'
        }
      default:
        return {
          status : 409,
          message: 'Algo deu errado, tente mais tarde'
        }
      break
    }
  }
  
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
    createCollaboratorDto.password = await bcrypt.hash(createCollaboratorDto.password, 10);
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

  async update(CPF: string, updateCollaboratorDto: UpdateCollaboratorDto) {
    const time = FindTimeSP();
    updateCollaboratorDto.update_at = time;
    if(updateCollaboratorDto.password){
      updateCollaboratorDto.password = await bcrypt.hash(updateCollaboratorDto.password, 10);
    }
    try{
      await this.collaboratorRepository.update(CPF,updateCollaboratorDto);
      return {
        status: 200,
        message:'Colaborador atualizado com sucesso!'
      }
    }catch(e){
      console.log(e)
      return {
        status:409,
        message:'Não foi possivel atualizar o colaborador, algo deu errado!'
      }
    }
  }

  remove(id: number) {
    return `This action removes a #${id} collaborator`;
  }
}
