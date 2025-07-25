import { Inject, Injectable } from '@nestjs/common';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { SingInCollaboratorDto } from './dto/auth/singIn.dto';
import { Not, Repository } from 'typeorm';
import { Collaborator } from './entities/collaborator.entity';
import { EmailService } from 'src/email/email.service';
import { BucketService } from 'src/bucket/bucket.service';
import { UploadCollaboratorDto } from './dto/upload-collaborator.sto';
import { UpdateIdWorkCollaboratorDto } from './dto/updateIdWork-collaborator.dto';
import { UpdatePasswordCollaboratorDto } from './dto/updatePassword-collaborator.dto';
import * as bcrypt from 'bcrypt';
import FindTimeSP from 'hooks/time';
@Injectable()
export class CollaboratorService {
  constructor(
    @Inject('COLLABORATOR_REPOSITORY')
    private collaboratorRepository: Repository<Collaborator>,
    private readonly emailService: EmailService,
    private readonly bucketService: BucketService,
  ) {}

  async singIn(singInCollaboratorDto: SingInCollaboratorDto) {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { CPF: singInCollaboratorDto.cpf },
    });
    if (!collaborator) {
      return {
        status: 409,
        message: 'Acesso incorreto',
      };
    }
    const auth = await bcrypt.compare(
      singInCollaboratorDto.password,
      collaborator.password,
    );
    switch (auth) {
      case true:
        return {
          status: 200,
          message: 'Acesso liberado',
          collaborator: collaborator,
        };
      case false:
        return {
          status: 409,
          message: 'Acesso incorreto',
        };
      default:
        return {
          status: 409,
          message: 'Algo deu errado, tente mais tarde',
        };
    }
  }

  async create(createCollaboratorDto: CreateCollaboratorDto) {
    const existingCPFCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.CPF },
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne(
      {
        where: { phone: createCollaboratorDto.phone },
      },
    );
    const existingEmailCollaborator = await this.collaboratorRepository.findOne(
      {
        where: { email: createCollaboratorDto.email },
      },
    );

    if (existingCPFCollaborator) {
      return {
        status: 409,
        message: 'CPF já existe.',
      };
    }

    if (existingPhoneCollaborator) {
      return {
        status: 409,
        message: 'Celular já existe.',
      };
    }

    if (existingEmailCollaborator) {
      return {
        status: 409,
        message: 'E-mail já existe.',
      };
    }

    const time = FindTimeSP();
    createCollaboratorDto.create_at = time;
    createCollaboratorDto.password = await bcrypt.hash(
      createCollaboratorDto.password,
      10,
    );
    const newCollaborator = await this.collaboratorRepository.save(
      createCollaboratorDto,
    );
    if (newCollaborator) {
      return {
        status: 201,
        message: 'Colaborador criado com sucesso! ',
      };
    }
  }

  async findAllPeople(cpf: string) {
    const peoples = await this.collaboratorRepository.find({
      where: {
        CPF: Not(cpf),
      },
    });

    const enrichedPeoples = await Promise.all(
      peoples.map(async (person) => {
        const picture = await this.findFile(person.CPF, 'picture');
        const gallery = await this.findFile(person.CPF, 'gallery');

        return {
          collaborator: {
            collaborator: person,
            picture:picture.path,
            gallery,
          }
        };
      }),
    );

    return {
      status: 200,
      message: 'success',
      peoples: enrichedPeoples,
    };
  }

  async checkCollaborator(createCollaboratorDto: CreateCollaboratorDto) {
    const existingCPFCollaborator = await this.collaboratorRepository.findOne({
      where: { CPF: createCollaboratorDto.CPF },
    });
    const existingPhoneCollaborator = await this.collaboratorRepository.findOne(
      {
        where: { phone: createCollaboratorDto.phone },
      },
    );
    const existingEmailCollaborator = await this.collaboratorRepository.findOne(
      {
        where: { email: createCollaboratorDto.email },
      },
    );

    if (existingCPFCollaborator) {
      return {
        status: 409,
        message: 'CPF já existe.',
      };
    }

    if (existingPhoneCollaborator) {
      return {
        status: 409,
        message: 'Celular já existe.',
      };
    }

    if (existingEmailCollaborator) {
      return {
        status: 409,
        message: 'E-mail já existe.',
      };
    }

    return await this.emailService.sendCode(createCollaboratorDto.email);
  }

  async resendCodeEmail(email: string) {
    return await this.emailService.sendCode(email);
  }

  async uploadFile(
    uploadCollaboratorDto: UploadCollaboratorDto,
    file: Express.Multer.File,
  ) {
    return await this.bucketService.UploadCollaborator(
      file,
      uploadCollaboratorDto.name,
      uploadCollaboratorDto.side,
      uploadCollaboratorDto.cpf,
    );
  }

  async uploadSignatureFile(
    uploadCollaboratorDto: UploadCollaboratorDto,
    file: Express.Multer.File,
  ) {
    return await this.bucketService.UploadCollaborator(
      file,
      'signature',
      '',
      uploadCollaboratorDto.cpf,
    );
  }

  async findFile(cpf: string, file: string) {
    return this.bucketService.findCollaborator(cpf, file);
  }

  async findPercentage(CPF: string) {
    const response = await this.checkAccountCompletion(CPF);
    if (response.status === 200) {
      const progress = this.checkProfileProgress(response);
      return {
        status: 200,
        progress: progress,
      };
    } else {
      return {
        status: 500,
        message: 'error',
      };
    }
  }

  checkProfileProgress(data: any) {
    const collaborator = data.collaborator || {};
    const missingFields = data.missingFields || [];
    const files = data.files || {};
    const missingDocuments = files.missingDocuments || [];

    // Função para verificar todos campos obrigatórios de um objeto, ignorando algumas chaves
    const allRequiredFieldsFilled = (
      obj: any,
      ignoreKeys: string[] = [],
    ): boolean => {
      if (!obj) return false;

      return Object.entries(obj)
        .filter(([key]) => !ignoreKeys.includes(key))
        .every(([_, value]) => {
          if (value == null) return false;
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          if (typeof value === 'object') return Object.keys(value).length > 0;
          return Boolean(value);
        });
    };

    // Verifica se pelo menos 1 serviço está preenchido
    const hasAnyService = (services: any): boolean => {
      if (!services || typeof services !== 'object') return false;
      return Object.values(services).some(
        (service) => service && Object.keys(service).length > 0,
      );
    };

    // Verifica se pelo menos 1 rede social está preenchida
    const hasAnySocial = (social: any): boolean => {
      if (!social || typeof social !== 'object') return false;
      return Object.values(social).some(
        (value) => value && value.toString().trim().length > 0,
      );
    };

    // Campos obrigatórios dos dados pessoais, incluindo picture (foto)
    const personalDataFields = [
      'CPF',
      'name',
      'sex',
      'PCD',
      'email',
      'phone',
      'birth',
      'zip_code',
      'street',
      'district',
      'city',
      'uf',
      'number',
    ];

    // Verifica se todos os dados pessoais estão preenchidos, e picture NÃO está em missingFields
    const isFieldFilled = (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    };

    const personalDataComplete =
      personalDataFields.every((field) => isFieldFilled(collaborator[field])) &&
      !missingFields.includes('Picture');

    // Documents: verifica se algum dos documentos (exceto Gallery, CV, Signature) está pendente
    const documentsGroup = [
      'RG',
      'Work_Card',
      'Address',
      'Military_Certificate',
      'School_History',
    ];

    const documentsComplete =
      documentsGroup.filter((doc) => missingDocuments.includes(doc)).length ===
      0;

    // Sobre mim: about + presentation
    const aboutComplete =
      allRequiredFieldsFilled(collaborator.about) &&
      collaborator.presentation &&
      collaborator.presentation.trim().length > 0;

    // Como quer trabalhar: todos obrigatórios exceto locations e showFarWork
    const howWorkComplete = allRequiredFieldsFilled(collaborator.howWork, [
      'locations',
      'showFarWork',
    ]);

    // Progresso
    const progress = {
      personalData: personalDataComplete,
      socialNetworks: hasAnySocial(collaborator.social),
      documents: documentsComplete,
      gallery: !missingDocuments.includes('Gallery'), // gallery único
      resume: !missingDocuments.includes('CV'), // CV único
      signature: !missingDocuments.includes('Signature'), // assinatura única
      aboutMe: aboutComplete,
      workPreferences: howWorkComplete,
      services: hasAnyService(collaborator.service),
      agreement: Boolean(collaborator.terms) && Boolean(collaborator.password),
    };

    const completedSections = Object.values(progress).filter(Boolean).length;
    const totalSections = Object.keys(progress).length;

    return {
      ...progress,
      percentage: Math.round((completedSections / totalSections) * 100),
      isComplete: completedSections === totalSections,
    };
  }

  async findDossie(cpf: string) {
    const collaborator = await this.collaboratorRepository.findOne({
      where: { CPF: cpf },
      relations: ['id_work'],
    });

    if (!collaborator) {
      return {
        status: 404,
        message: 'collaborator does not exist',
      };
    }

    return this.bucketService.findDossieCollaborator(
      cpf,
      collaborator.id_work.id,
    );
  }

  async findAll() {
    try {
      const collaborators = await this.collaboratorRepository.find();
      const collaboratorsWithPicture = await Promise.all(
        collaborators.map(async (collaborator) => {
          const pictureResponse = await this.bucketService.getFileFromBucket(
            `collaborator/${collaborator.CPF}/Picture`,
          );

          return {
            ...collaborator,
            picture: pictureResponse || null,
          };
        }),
      );

      return {
        status: 200,
        candidates: collaboratorsWithPicture,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Error internal',
      };
    }
  }

  async findOne(CPF: string) {
    let response = await this.collaboratorRepository.findOne({
      where: { CPF },
      relations: ['id_work'],
    });
    const picture = await this.findFile(CPF, 'picture');
    const gallery = await this.findFile(CPF, 'gallery');
    if (response) {
      return {
        status: 200,
        collaborator: response,
        picture: picture.path,
        gallery: gallery,
      };
    }
    return {
      status: 409,
      message: 'Registro não encontrado',
    };
  }

  async removeFile(key: string) {
    const response = await this.bucketService.deleteFile(key);
    if (response) {
      return {
        status: 200,
        message: 'Deleted successfully',
      };
    }
    return {
      status: 500,
      message: 'error',
    };
  }

  async checkAccountCompletion(CPF: string) {
    const response = await this.collaboratorRepository.findOne({
      where: { CPF },
    });

    if (response) {
      const missingFields = [];
      const files =
        await this.bucketService.checkCollaboratorBucketDocuments(response);
      // Verifica se o endereço está completo
      const addressFields = [
        'zip_code',
        'street',
        'district',
        'city',
        'uf',
        'number',
      ];

      const missingAddressFields = addressFields.filter(
        (field) => !response[field],
      );

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

      if (files.missingDocuments) {
        if (files.missingDocuments.includes('Picture')) {
          // Remove "Picture" de missingDocuments
          files.missingDocuments = files.missingDocuments.filter(
            (doc) => doc !== 'Picture',
          );

          // Adiciona "Picture" a missingFields se já não estiver lá
          if (!missingFields.includes('Picture')) {
            missingFields.push('Picture');
          }
        }
      }

      return {
        status: 200,
        collaborator: response,
        missingFields: missingFields.length > 0 ? missingFields : null,
        files: files,
      };
    } else {
      // Caso não encontre o colaborador
      return {
        status: 404,
        message: 'Colaborador não encontrado',
      };
    }
  }

  async update(CPF: string, updateCollaboratorDto: UpdateCollaboratorDto) {
    try {
      const response = await this.collaboratorRepository.update(
        CPF,
        updateCollaboratorDto,
      );
      if (response.affected === 1) {
        const collaborator = await this.findOne(CPF);
        return {
          status: 200,
          collaborator: collaborator,
          message: 'Colaborador atualizado com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel atualizar o colaborador, algo deu errado!',
      };
    } catch (e) {
      e;
      return {
        status: 404,
        message: 'Não foi possivel atualizar o colaborador, algo deu errado!',
      };
    }
  }

  async updatePassword(
    CPF: string,
    updatePasswordCollaboratorDto: UpdatePasswordCollaboratorDto,
  ) {
    const time = FindTimeSP();
    updatePasswordCollaboratorDto.update_at = time;

    const collaborator = await this.collaboratorRepository.findOne({
      where: { CPF },
    });
    if (!collaborator) {
      return {
        status: 404,
        message: 'Colaborador não encontrado',
      };
    }

    const { currentPassword, newPassword } = updatePasswordCollaboratorDto;

    if (!currentPassword || !newPassword) {
      return {
        status: 500,
        message: 'Senha atual e nova senha são obrigatórias',
      };
    }


    if(currentPassword !== 'newpass@32735714^^^^^^^~~çsaklfmsçkflçk'){
      const isMatch = await bcrypt.compare(
        currentPassword,
        collaborator.password,
      );
  
      if (!isMatch ) {
        return {
          status: 500,
          message: 'Senha atual incorreta',
        };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.collaboratorRepository.update(
      { CPF },
      {
        password: hashedPassword,
        update_at: time,
      },
    );

    return { status: 200, message: 'Senha atualizada com sucesso' };
  }

  async updateIdWork(
    CPF: string,
    updateCollaboratorDto: UpdateIdWorkCollaboratorDto,
  ) {
    const time = FindTimeSP();
    updateCollaboratorDto.update_at = time;
    const response = await this.collaboratorRepository.update(
      CPF,
      updateCollaboratorDto,
    );
    if (response.affected === 1) {
      return {
        status: 200,
        message: 'Id updated successfully',
      };
    }
    return {
      status: 404,
      message: 'Error updating id work',
    };
  }

  remove(id: number) {
    return `This action removes a #${id} collaborator`;
  }
}
