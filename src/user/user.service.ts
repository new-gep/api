import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SingInUserDto } from './dto/singIn.-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import FindTimeSP from 'hooks/time';
import GenerateToken from 'hooks/auth/generateToken';
@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') 
    private userRepository: Repository<User>,
  ){}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where:
       { user: createUserDto.user }
    });

    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      return {
        status:409,
        message:'Usário já existe.',
      }
    };

    if (existingEmail) {
      return {
        status:409,
        message:'Email já existe.',
      }
    };

    const time = FindTimeSP();
    createUserDto.create_at = time;
    createUserDto.id = await this.generateRandomId();
    const newUser = await this.userRepository.save(createUserDto);
    if(newUser){
      return {
        status : 201,
        message: 'Usário criado com sucesso! ',
      }
    };
  }

  async singUp(createUserDto: CreateUserDto){
    const existingUser = await this.userRepository.findOne({
      where:
       { user: createUserDto.user }
    });

    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      return {
        status:409,
        message:'Usário já existe.',
      }
    };

    if (existingEmail) {
      return {
        status:409,
        message:'Email já existe.',
      }
    };

    return null
  }
  
  async singIn(singInUserDto:SingInUserDto){
    
    const user = await this.userRepository.findOne({
      where:
       { user: singInUserDto.user }
    });

    if (!user) {
      return {
        status:409,
        message:'Usário não existe.',
      }
    };

    if(!singInUserDto.password){
      return  {
        status:200,
        message:'Usúario existe'
      }
    };

    if(singInUserDto.password === user.password){
      const  token = await GenerateToken({id:user.id, user:user.user, email:user.email, phone:user.phone, cnpj:user.CNPJ_company})
      return token
    }

    return{
      status:500,
      message:'Senha Incorreta'
    }

  }

  findAll() {
    return `This action returns all user`;
  };

  findOne(id: number) {
    return `This action returns a #${id} user`;
  };

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  };

  remove(id: number) {
    return `This action removes a #${id} user`;
  };

  private async generateRandomId(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomId = '';
    let existingId;
  
    do {
      randomId = '#';
      for (let i = 0; i < 4; i++) {
        randomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }
  
      // Verifica se o ID já existe no banco de dados
      existingId = await this.userRepository.findOne({
        where: { id: randomId }
      });
    } while (existingId); // Continua gerando IDs até encontrar um único
  
    return randomId;
  };
  
}


