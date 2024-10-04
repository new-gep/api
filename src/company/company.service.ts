import { Inject, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import FindTimeSP from 'hooks/time';
@Injectable()
export class CompanyService {
  constructor(
    @Inject('COMPANY_REPOSITORY') 
    private companyRepository: Repository<Company>,
    readonly userService: UserService
  ){}


  async create(createCompanyDto: CreateCompanyDto) {
    try{
      const existingCNPJCompany = await this.companyRepository.findOne({
        where: { CNPJ: createCompanyDto.CNPJ }
      });
  
      if(existingCNPJCompany) {
        return {
          status:409,
          message:'CNPJ já cadastrado.',
        }
      };
  
      const ParamsNewUser = {
        user: createCompanyDto.user,
        name: createCompanyDto.responsible,
        password: createCompanyDto.password,
        email: createCompanyDto.email,
        phone: createCompanyDto.phone,
        CNPJ_company:createCompanyDto.CNPJ
      };
      
      const checkUp = await this.userService.singUp(ParamsNewUser)
  
      if(checkUp){
        return checkUp
      };
  
      const time = await FindTimeSP();
      createCompanyDto.create_at = time;
  
      await this.companyRepository.save(createCompanyDto);
     const user = await this.userService.create(ParamsNewUser);

      return{
        status :201,
        message:'Conta e usário criados.',
        token: user.token
      }
    }catch(e){
      console.log(e)
      return{
        status: 500,
        message:'Erro interno tente mais tarde'
      }
    }
    // this.userService.create()
  };

  findAll() {
    return `This action returns all company`;
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: number, updateCompanyDto: UpdateCompanyDto) {
    return `This action updates a #${id} company`;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
