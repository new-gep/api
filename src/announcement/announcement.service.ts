import { Inject, Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { UploadAnnouncementDto } from './dto/upload-announcement.dto';
import { Announcement } from './entities/announcement.entity';
import { BucketService } from 'src/bucket/bucket.service';
import { IsNull, Repository } from 'typeorm';
import findTimeSP from 'hooks/time';
@Injectable()
export class AnnouncementService {
  constructor(
    @Inject('ANNOUNCEMENT_REPOSITORY')
    private announcementRepository: Repository<Announcement>,
    private readonly bucketService: BucketService,
  ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    const time = findTimeSP();
    createAnnouncementDto.create_at = time;
    const response = await this.announcementRepository.save(
      createAnnouncementDto,
    );

    if (response) {
      return {
        status: 201,
        message: 'Anúncio criado.',
        announcement: response,
      };
    } else {
      return {
        status: 500,
        message: 'Algo deu errado, tente mais tarde.',
      };
    }
  }

  async uploadFile(
    uploadAnnouncementDto: UploadAnnouncementDto,
    file: Express.Multer.File,
  ) {
    return await this.bucketService.uploadAnnouncement(
      file,
      uploadAnnouncementDto.id,
    );
  }

  findAll() {
    return `This action returns all announcement`;
  }

  async findOne(cpf: any) {
    const response = await this.announcementRepository.find({
      where: {
        CPF_Creator: {
          CPF: cpf, // isso funciona somente se CPF for um campo da entidade Collaborator
        },
        delete_at: IsNull(),
      },
    });

    const enrichedAnnouncements = await Promise.all(
      response.map(async (announcement) => {
        const gallery = await this.bucketService.findAnnouncement(
          announcement.id,
        );
        return {
          ...announcement,
          gallery, // adiciona imagens ao objeto do anúncio
        };
      }),
    );

    if (response) {
      return {
        status: 200,
        message: 'success',
        announcements: enrichedAnnouncements,
      };
    } else {
      return {
        status: 500,
        message: 'erro ',
      };
    }
  }

  update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    return `This action updates a #${id} announcement`;
  }

  async remove(id: number) {
    try {
      const time = findTimeSP();

      const propsDelete = {
        delete_at: time,
      };

      const response = await this.announcementRepository.update(
        id,
        propsDelete,
      );
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Anúncio deletado com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel deletar o anúncio, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }
}
