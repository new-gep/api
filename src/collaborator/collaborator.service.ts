import { Inject, Injectable } from '@nestjs/common';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { SingInCollaboratorDto } from './dto/auth/singIn.dto';
import { Repository   } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { EmailService } from 'src/email/email.service';
import { BucketService } from 'src/bucket/bucket.service';
import * as bcrypt from 'bcrypt';
import FindTimeSP from 'hooks/time';
import { UploadCollaboratorDto } from './dto/upload-collaborator.sto';
import { UpdateIdWorkCollaboratorDto } from './dto/updateIdWork-collaborator.dto';
@Injectable()
export class CollaboratorService {
  constructor(
    @Inject('COLLABORATOR_REPOSITORY') 
    private collaboratorRepository: Repository<Collaborator>,
    private readonly emailService : EmailService,
    private readonly bucketService : BucketService
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
    }
  };
  
  async create(createCollaboratorDto: CreateCollaboratorDto) {
    
    const existingCPFCollaborator   = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.CPF }
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne({
      where: { phone: createCollaboratorDto.phone }
    });
    const existingEmailCollaborator = await this.collaboratorRepository.findOne({
      where: { email: createCollaboratorDto.email }
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
  };

  async checkCollaborator(createCollaboratorDto: CreateCollaboratorDto){
    const existingCPFCollaborator   = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.CPF }
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne({
      where: { phone: createCollaboratorDto.phone }
    });
    const existingEmailCollaborator = await this.collaboratorRepository.findOne({
      where: { email: createCollaboratorDto.email }
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

  };

  async resendCodeEmail(email:string){
    return await this.emailService.sendCode(email)
  };

  async uploadFile(uploadCollaboratorDto:UploadCollaboratorDto, file: Express.Multer.File){
    return await this.bucketService.UploadCollaborator(file, uploadCollaboratorDto.name, uploadCollaboratorDto.side, uploadCollaboratorDto.cpf)
  };

  async findFile(cpf:string, file:string){
    return this.bucketService.findCollaborator(cpf, file)
  };

  findAll() {
    return `This action returns all collaborator`;
  };

  async findOne(CPF: string) {
    let response = await this.collaboratorRepository.findOne({ where: { CPF }, relations: ['id_work'] });
    response.id_work.time = JSON.parse(response.id_work.time);
    const picture  = await this.findFile(CPF, 'picture')
    if(response){
      return {
        status:200,
        collaborator:response,
        picture: picture.path
      }
    }
    return {
      status :409,
      message:'Registro não encontrado'
    }
  };

  async checkAccountCompletion(CPF: string) {
    const response = await this.collaboratorRepository.findOne({ where: { CPF } });

    if (response) {
        const missingFields = [];
        const files = await this.bucketService.checkCollaboratorBucketDocuments(response);
        // Verifica se o endereço está completo
        const addressFields = ['zip_code', 'street', 'district', 'city', 'uf', 'number'];
        const missingAddressFields = addressFields.filter(field => !response[field]);
        if (missingAddressFields.length > 0) {
            missingFields.push('address');
        }

        // Verifica se o campo marriage está preenchido
        if (!response.marriage) {
            missingFields.push('marriage');
        }

        // Verifica se o campo children está preenchido
        if (!response.children && response.children != 0) {
            missingFields.push('children');
        }

        if(files.missingDocuments){
          if (files.missingDocuments.includes("Picture")) {
            // Remove "Picture" de missingDocuments
            files.missingDocuments = files.missingDocuments.filter(doc => doc !== "Picture");
        
            // Adiciona "Picture" a missingFields se já não estiver lá
            if (!missingFields.includes("Picture")) {
                missingFields.push("Picture");
            }
          };
        };

        return {
            status: 200,
            collaborator: response,
            missingFields: missingFields.length > 0 ? missingFields : null,
            files : files
        };
        
    } else {
        // Caso não encontre o colaborador
        return {
            status: 404,
            message: "Colaborador não encontrado",
        };
    }
  };

  async update(CPF: string, updateCollaboratorDto: UpdateCollaboratorDto) {
    
    const time = FindTimeSP();
    updateCollaboratorDto.update_at = time;
    if(updateCollaboratorDto.password){
      updateCollaboratorDto.password = await bcrypt.hash(updateCollaboratorDto.password, 10);
    }
    try{
      const response = await this.collaboratorRepository.update(CPF,updateCollaboratorDto);
      if(response.affected === 1){
        const collaborator = await this.findOne(CPF)
        console.log(collaborator);
        return {
          status: 200,
          collaborator:collaborator,
          message:'Colaborador atualizado com sucesso!'
          
        }
      }
      return {
        status:404,
        message:'Não foi possivel atualizar o colaborador, algo deu errado!'
      }
    }catch(e){
      (e)
      return {
        status:404,
        message:'Não foi possivel atualizar o colaborador, algo deu errado!'
      }
    }
  };  

  async updateIdWork(CPF: string, updateCollaboratorDto: UpdateIdWorkCollaboratorDto) {
    const time = FindTimeSP();
    updateCollaboratorDto.update_at = time;
    const response = await this.collaboratorRepository.update(CPF, updateCollaboratorDto);
    if(response.affected === 1){
      return {
        status: 200,
        message:'Id updated successfully'
      }
    }
    return {
      status:404,
      message:'Error updating id work'
    }
  };

  remove(id: number) {
    return `This action removes a #${id} collaborator`;
  };
}
