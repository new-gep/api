import { Inject, Injectable } from '@nestjs/common';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { UpdateSignatureDto } from './dto/update-signature.dto';
import { Repository } from 'typeorm';
import FindTimeSP from 'hooks/time';
import { Signature } from './entities/signature.entity';

@Injectable()
export class SignatureService {
  constructor(
    @Inject('SIGNATURE_REPOSITORY')
    private signatureRepository: Repository<Signature>,
  ) {}

  async create(createSignatureDto: CreateSignatureDto) {
    const time = FindTimeSP();
    createSignatureDto.create_at = time;
    const signature = await this.signatureRepository.save(createSignatureDto);

    if(signature){
      return {
        status: 201,
        message: 'Signature successfully created',
      };
    }else{
      return {
        status: 400,
        message: 'Error creating signature',
      };
    }
  }

  findAll() {
    return `This action returns all signature`;
  }

  findOne(id: number) {
    return `This action returns a #${id} signature`;
  }

  update(id: number, updateSignatureDto: UpdateSignatureDto) {
    return `This action updates a #${id} signature`;
  }

  remove(id: number) {
    return `This action removes a #${id} signature`;
  }

}


