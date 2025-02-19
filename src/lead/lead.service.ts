import { Inject, Injectable } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import FindTimeSP from 'hooks/time';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';

@Injectable()
export class LeadService {
  constructor(
    @Inject('LEAD_REPOSITORY')
    private leadRepository: Repository<Lead>,
  ) {}

  async create(createLeadDto: CreateLeadDto) {
    try{
      const time = FindTimeSP();
      createLeadDto.create_at = time;
      console.log(createLeadDto);
      const lead = await this.leadRepository.save(createLeadDto);

      if(lead){
        return {
          status: 201,
          message: 'Lead successfully created',
        };
      }else{
        return {
          status: 400,
          message: 'Error creating lead',
        };
      }
    }catch(e){
      console.log(e);
      return {
        status: 500,
        message: 'Server error',
      };
    }
    
  }

  findAll() {
    return `This action returns all lead`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lead`;
  }

  update(id: number, updateLeadDto: UpdateLeadDto) {
    return `This action updates a #${id} lead`;
  }

  remove(id: number) {
    return `This action removes a #${id} lead`;
  }
}


