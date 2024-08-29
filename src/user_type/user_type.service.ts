import { Inject, Injectable } from '@nestjs/common';
import { CreateUserTypeDto } from './dto/create-user_type.dto';
import { UpdateUserTypeDto } from './dto/update-user_type.dto';
import { Repository } from 'typeorm';
import { UserType } from './entities/user_type.entity';

@Injectable()
export class UserTypeService {
  constructor(
    @Inject('USERTYPE_REPOSITORY') 
    private userRepository: Repository<UserType>,
  ){}
  
  create(createUserTypeDto: CreateUserTypeDto) {
    return 'This action adds a new userType';
  }

  findAll() {
    return `This action returns all userType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userType`;
  }

  update(id: number, updateUserTypeDto: UpdateUserTypeDto) {
    return `This action updates a #${id} userType`;
  }

  remove(id: number) {
    return `This action removes a #${id} userType`;
  }
}
