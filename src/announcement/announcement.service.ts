import { Inject, Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/Announcement.entity';
import findTimeSP from 'hooks/time';
import { Repository } from 'typeorm';
@Injectable()
export class AnnouncementService {
    constructor(
       @Inject('ANNOUNCEMENT_REPOSITORY')
       private announcementRepository: Repository<Announcement>,
     ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    const time = findTimeSP();
    createAnnouncementDto.create_at = time;
    console.log(createAnnouncementDto)
    const response = await this.announcementRepository.save(createAnnouncementDto);
    if (response) {
      return {
        status: 201,
        message: 'Anúncio criado.',
        absence: response,
      };
    } 
    else {
      return {
        status: 500,
        message: 'Algo deu errado, tente mais tarde.',
      };
    }
  }

  findAll() {
    return `This action returns all announcement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} announcement`;
  }

  update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    return `This action updates a #${id} announcement`;
  }

  remove(id: number) {
    return `This action removes a #${id} announcement`;
  }
}
