import { Inject, Injectable } from '@nestjs/common';
import { CreatePictureDto } from './dto/create-picture.dto';
import { UpdatePictureDto } from './dto/update-picture.dto';
import { Picture } from './entities/picture.entity';
import { Repository } from 'typeorm';
import FindTimeSP from 'hooks/time';
@Injectable()
export class PictureService {
  constructor(
    @Inject('PICTURE_REPOSITORY') 
    private pictureRepository: Repository<Picture>,
  ){}

  async create(createPictureDto: CreatePictureDto) {

    try{
      const picture = await this.pictureRepository.findOne({
        where: { 
          CPF_collaborator: createPictureDto.CPF_collaborator,
          picture: createPictureDto.picture
        }
      });

      if (picture) {
        return {
          status:409,
          message:'Imagem já existe',
        }
      };
  
      const time = FindTimeSP();
      createPictureDto.create_at = time
      const newPicture = await this.pictureRepository.save(createPictureDto);
      
      if(newPicture){
        return {
          status :201,
          message:'Imagem criado com sucesso! ',
        }
      }
      
    }catch(e){
      console.log(e)
      return {
        status: 500,
        message: 'Ocorreu um erro no servidor',
      };
      
    }
  };

  findAll() {
    return `This action returns all picture`;
  };

  async findOne(CPF_collaborator: string) {
    try {
        const pictures = await this.pictureRepository.find({
            where: { CPF_collaborator: CPF_collaborator },
        });

        // Se o array estiver vazio ou indefinido, logue o resultado para diagnóstico
        if (!pictures || pictures.length === 0) {
            return {
                status: 404,  // Usando 404, pois não encontrou os dados
                message: 'Nenhuma imagem encontrada para este colaborador',
            };
        }

        return {
            status: 200,
            pictures: pictures,
        };
    } catch (e) {
        console.error('Erro ao buscar imagens:', e);
        return {
            status: 500,
            message: 'Ocorreu um erro no servidor',
        };
    }
};


  update(id: number, updatePictureDto: UpdatePictureDto) {
    return `This action updates a #${id} picture`;
  };

  remove(id: number) {
    return `This action removes a #${id} picture`;
  };

}


