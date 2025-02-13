import { Inject, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import FindTimeSP from 'hooks/time';
import { BucketService } from 'src/bucket/bucket.service';
@Injectable()
export class CompanyService {
  constructor(
    @Inject('COMPANY_REPOSITORY')
    private companyRepository: Repository<Company>,
    readonly userService: UserService,
    readonly bucketService: BucketService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const existingCNPJCompany = await this.companyRepository.findOne({
        where: { CNPJ: createCompanyDto.CNPJ },
      });

      if (existingCNPJCompany) {
        return {
          status: 409,
          message: 'CNPJ já cadastrado.',
        };
      }

      const ParamsNewUser = {
        user: createCompanyDto.user,
        name: createCompanyDto.responsible,
        password: createCompanyDto.password,
        email: createCompanyDto.email,
        phone: createCompanyDto.phone,
        hierarchy: '0',
        CNPJ_company: createCompanyDto.CNPJ,
      };

      const checkUp = await this.userService.singUp(ParamsNewUser);

      if (checkUp) {
        return checkUp;
      }

      const time = await FindTimeSP();
      createCompanyDto.create_at = time;

      await this.companyRepository.save(createCompanyDto);
      const user = await this.userService.create(ParamsNewUser);

      return {
        status: 201,
        message: 'Conta e usário criados.',
        token: user.token,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno tente mais tarde',
      };
    }
    // this.userService.create()
  };

  findAll() {
    return `This action returns all company`;
  };

  findCompanyDocument(cnpj: string, document:string) {
    return this.bucketService.findCompanyDocument(cnpj, document);
  };

  uploadCompanyDocument(cnpj: string, document:string, file: any) {
    return this.bucketService.uploadCompany(file, cnpj, document);
  };

  async findOne(cnpj: string) {
    try {
      const logo = await this.bucketService.findCompanyDocument(cnpj, 'logo');
      const signature = await this.bucketService.findCompanyDocument(cnpj, 'signature');

      const response = await this.companyRepository.findOne({
        where: { CNPJ: cnpj },
      });

      if (response) {
        return {
          status: 200,
          company: response,
          logo:  logo.status == 404 ? null : logo.path,
          signature:signature.status == 404 ? null : signature.path, 
        };
      }
      return {
        status: 409,
        message: 'Registro não encontrado',
      };
    } catch (error) {
      console.log(error); 
      return {
        status: 500,
        message: 'Erro no servidor',
      };
    }
  };

  async update(CNPJ: string, updateCompanyDto: UpdateCompanyDto) {
    const time = FindTimeSP();
    updateCompanyDto.update_at = time;
    try{
      const response = await this.companyRepository.update(CNPJ,updateCompanyDto);
      if(response.affected === 1){
        return {
          status: 200,
          message:'Empresa atualizada com sucesso!'
        }
      }
      return {
        status:404,
        message:'Não foi possivel atualizar a empresa, algo deu errado!'
      }
    }catch(e){
      console.log(e)
      return {
        status :500,
        message:'Erro interno!'
      }
    }
  };

  async removeFile(path: string) {
    try{
      const response = await this.bucketService.deleteFile(path);
      if(response){
        return {
          status : 200,
          message: 'Arquivo deletado com sucesso',
        }
      }
  
      return {
        status : 404,
        message: 'Erro ao deletar o arquivo',
      }

    }catch(e){
      return {
        status : 500,
        message: 'Erro ao tentar deletar arquivo',
      }
    }

  };

  remove(id: number) {
    return `This action removes a #${id} company`;
  };
}
