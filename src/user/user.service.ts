import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SingInUserDto } from './dto/singIn.-user.dto';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import FindTimeSP from 'hooks/time';
import GenerateToken from 'hooks/auth/generateToken';
import DecodeToken from 'hooks/auth/decodeToken';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { user: createUserDto.user },
    });

    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      return {
        status: 409,
        message: 'Usário já existe.',
      };
    }

    if (existingEmail) {
      return {
        status: 409,
        message: 'Email já existe.',
      };
    }

    const time = FindTimeSP();
    createUserDto.create_at = time;
    createUserDto.id = await this.generateRandomId();
    createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    const newUser = await this.userRepository.save(createUserDto);

    if (newUser) {
      const token = await GenerateToken({
        id: newUser.id,
        user: newUser.user,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        cnpj: newUser.CNPJ_company,
        hierarchy: newUser.hierarchy,
      });


      return {
        status: 201,
        message: 'Usário criado com sucesso! ',
        user: newUser,
        token: token,
      };
    }
  }

  async findAllByCNPJ(CNPJ: string) {
    try {
      const response = await this.userRepository.find({
        where: { CNPJ_company: { CNPJ: CNPJ}, delete_at: IsNull() },
      });

      if (response) {
        return {
          status: 200,
          users: response,
        };
      } 
      else {
        return {
          status: 404,
          message: 'usuario não encontrado',
        };
      }
    } catch (e) {

      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  }

  async singUp(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { user: createUserDto.user },
    });

    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      return {
        status: 409,
        message: 'Usário já existe.',
      };
    }

    if (existingEmail) {
      return {
        status: 409,
        message: 'Email já existe.',
      };
    }

    return null;
  }

  async singIn(singInUserDto: SingInUserDto) {
    const user = await this.userRepository.findOne({
      where: { user: singInUserDto.user, delete_at: IsNull() },
    });
    console.log(user);

    if (!user) {
      return {
        status: 409,
        message: 'Usário não existe.',
      };
    }

    if (!singInUserDto.password) {
      return {
        status: 200,
        name: user.name,
        message: 'Usúario existe',
      };
    }

    const auth = await bcrypt.compare(singInUserDto.password, user.password);
    if (auth) {
      const token = await GenerateToken({
        id: user.id,
        avatar: user.avatar,
        user: user.user,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hierarchy: user.hierarchy,
        cnpj: user.CNPJ_company,
        lastUpdate: user.update_at,
      })

      return {
        status: 200,
        token: token,
      };
    } else {
      return {
        status: 409,
        message: 'Senha incorreta.',
      };
    }
  }

  async masterAdmin(cnpj: string) {
    const response = await this.userRepository.findOne({
      where: {
        CNPJ_company: { CNPJ: cnpj },
        hierarchy: '0',
      },
      relations: ['CNPJ_company'],
    });


    if (response) {
      return {
        status: 200,
        user: response,
      };
    } else {
      return {
        status: 404,
        message: 'user not found',
      };
    }
  }

  verifyToken(token: string) {
    const response = DecodeToken(token);
    if (!response) {
      return {
        status: 400,
        message: 'Token inválido',
      };
    }
    return {
      status: 200,
      dates: response,
    };
  }

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: string) {
    try {
      const response = await this.userRepository.findOne({
        where: { id: id },
      });

      if (response) {
        return {
          status: 200,
          user: response,
        };
      } else {
        return {
          status: 404,
          message: 'usuario não encontrado',
        };
      }
    } catch (e) {
      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Remove chaves com undefined ou null
    Object.keys(updateUserDto).forEach((key) => {
      if (updateUserDto[key] === undefined || updateUserDto[key] === null) {
        delete updateUserDto[key];
      }
    });

    if (updateUserDto.confirmPassword.trim() === '') {
      // A string está em branco (apenas espaços, tabs, etc.)
      delete updateUserDto.confirmPassword;
      delete updateUserDto.password;
    } else {
      const response = await this.findOne(id);
      const auth = await bcrypt.compare(
        updateUserDto.password,
        response.user.password,
      );

      if (!auth) {
        return {
          status: 404,
          message: 'Senha atual incorreta!',
        };
      }

      updateUserDto.password = await bcrypt.hash(
        updateUserDto.confirmPassword,
        10,
      );
      delete updateUserDto.confirmPassword;
    }
    const time = FindTimeSP();
    updateUserDto.update_at = time;

    try {
      const response = await this.userRepository.update(id, updateUserDto);
      console.log('response update',response.affected);
      if (response.affected === 1) {
        const user = await this.userRepository.findOne({
          where: { id },
          relations: ['CNPJ_company'], // <- aqui você traz a empresa!
        });
        console.log('user',user.CNPJ_company.CNPJ);
        //@ts-ignore
        // console.log({id: user.id,avatar: user.avatar,user: user.user,name: user.name,email: user.email, phone: user.phone,cnpj: user.CNPJ_company,lastUpdate: user.update_at, hierarchy: user.hierarchy});
        //@ts-ignore
        const token = await GenerateToken({id: user.id, avatar: user.avatar, user: user.user, name: user.name,email: user.email, phone: user.phone,cnpj: user.CNPJ_company.CNPJ,lastUpdate: user.update_at, hierarchy: user.hierarchy});
        return {
          status: 200,
          message: 'Usuário atualizado com sucesso!',
          token: token,
          update_at: time,
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel atualizar o usuário, algo deu errado!',
      };
    } catch (e) {
      console.log('error update',e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async updateByAdmin(id: string, updateUserDto: UpdateUserDto) {
    if(updateUserDto.password){
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }else{
      delete updateUserDto.password;
    }
    const response = await this.userRepository.update(id, updateUserDto);
    if (response.affected === 1) {
      return {
        status: 200,
        message: 'Usuário atualizado com sucesso!',
      };
    }
    return {
      status: 404,
      message: 'Usuário não encontrado!',
    };
  }

  async remove(id: string) {
    const date = FindTimeSP();
    const response = await this.userRepository.update(id, {
      delete_at: date,
    });

    if (response.affected === 1) {
      return {
        status: 200,
        message: 'Usuário deletado com sucesso!',
      };
    }

    return {
      status: 404,
      message: 'Usuário não encontrado!',
    };
  }

  private async generateRandomId(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomId = '';
    let existingId;

    do {
      randomId = '#';
      for (let i = 0; i < 4; i++) {
        randomId += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }

      // Verifica se o ID já existe no banco de dados
      existingId = await this.userRepository.findOne({
        where: { id: randomId },
      });
    } while (existingId); // Continua gerando IDs até encontrar um único

    return randomId;
  }
}
