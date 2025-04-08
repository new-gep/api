import { Inject, Injectable } from '@nestjs/common';
import { CreatePictureDto } from './dto/create-picture.dto';
import { UpdatePictureDto } from './dto/update-picture.dto';
import { Picture } from './entities/picture.entity';
import { IsNull, Repository } from 'typeorm';
import FindTimeSP from 'hooks/time';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
@Injectable()
export class PictureService {
  constructor(
    @Inject('PICTURE_REPOSITORY')
    private pictureRepository: Repository<Picture>,
    readonly collaboratorService: CollaboratorService,
  ) {}

  async create(createPictureDto: CreatePictureDto) {
    try {
      const picture = await this.pictureRepository.findOne({
        where: {
          CPF_collaborator: {CPF: createPictureDto.CPF_collaborator},
          id_work: {id: createPictureDto.id_work},
          picture: createPictureDto.picture,
          delete_at: IsNull(),
        },
      });

      if (picture) {
        return {
          status: 409,
          message: 'Imagem já existe',
        };
      }

      const time = FindTimeSP();
      createPictureDto.create_at = time;
      const newPicture = await this.pictureRepository.save(createPictureDto);

      if (newPicture) {
        return {
          status: 201,
          message: 'Imagem criado com sucesso! ',
        };
      }
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  async findSignatureAdmission(CPF_collaborator: string, id_work: number){
    try {
      const pictures = await this.pictureRepository.find({
        where: { CPF_collaborator: { CPF: CPF_collaborator}, id_work: { id: id_work } },
      });
      // Se o array estiver vazio ou indefinido, logue o resultado para diagnóstico
      if (!pictures || pictures.length === 0) {
        return {
          status: 404, // Usando 404, pois não encontrou os dados
          message: 'Nenhuma imagem encontrada para este colaborador',
        };
      }

      const filteredPictures = pictures.filter((item) =>
        item.picture.includes('Signature_Admission'),
      );

      return {
        status: 200,
        pictures: filteredPictures,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  async findSignatureDismissal(CPF_collaborator: string, id_work: number){
    try {
      const pictures = await this.pictureRepository.find({
        where: { CPF_collaborator: {CPF: CPF_collaborator}, id_work: {id: id_work} },
      });
      // Se o array estiver vazio ou indefinido, logue o resultado para diagnóstico
      if (!pictures || pictures.length === 0) {
        return {
          status: 404, // Usando 404, pois não encontrou os dados
          message: 'Nenhuma imagem encontrada para este colaborador',
        };
      }

      const filteredPictures = pictures.filter((item) =>
        item.picture.includes('Signature_Dismissal') || item.picture.includes('Signature_Communication'),
      );

      console.log(filteredPictures);

      return {
        status: 200,
        pictures: filteredPictures,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  findAll() {
    return `This action returns all picture`;
  }

  async findOne(CPF_collaborator: string,) {
    try {
      const response = await this.collaboratorService.findOne(CPF_collaborator);
      let pictures = await this.pictureRepository.find({
        where: {
          CPF_collaborator: {CPF: CPF_collaborator}
        },
      });
      // Se o array estiver vazio ou indefinido, logue o resultado para diagnóstico

      if (!pictures || pictures.length === 0) {
        return {
          status: 404, // Usando 404, pois não encontrou os dados
          message: 'Nenhuma imagem encontrada para este colaborador',
        };
      }
      if (response.collaborator.marriage == '0') {
        pictures = pictures.filter(
          (pic) => pic.picture !== 'Marriage_Certificate',
        );
      }
      if (response.collaborator.sex == 'F') {
        pictures = pictures.filter(
          (pic) => pic.picture !== 'Military_Certificate',
        );
      }

      return {
        status: 200,
        pictures: pictures,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  async findOnePicture(document: string, CPF_collaborator: string, jobId: number) {
    try {
      const picture = await this.pictureRepository.findOne({
        where: { CPF_collaborator: { CPF: CPF_collaborator }, id_work: { id: jobId } , picture: document },
      });

      return {
        status: 200,
        pictures: picture,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  async update(CPF: string, updatePictureDto: UpdatePictureDto) {
    try{
      const { status, id_user, id_work } = updatePictureDto;  // Extrai o campo `status` do DTO
      // Encontra o registro que corresponde ao CPF e picture
      const pictureRecord = await this.pictureRepository.findOne({
        where: { CPF_collaborator: { CPF: CPF}, picture: updatePictureDto.picture, id_work: { id: id_work } },
      });


      if (!pictureRecord) {
        return {
          status: 400,
          message: 'Registro não encontrado!',
          updatedPicture: pictureRecord,
        };
      }

      // Atualiza o status e o campo `update_at` com o tempo atual
      pictureRecord.id_user = id_user;
      pictureRecord.status = status;
      pictureRecord.update_at = FindTimeSP(); // Adiciona o tempo de atualização

      // Salva a atualização no banco de dados
      await this.pictureRepository.save(pictureRecord);

      return {
        status: 200,
        message: 'Registro atualizado com sucesso!',
        updatedPicture: pictureRecord,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno',
      };
    }
  }

  remove(id: number) {
    return `This action removes a #${id} picture`;
  }
}
