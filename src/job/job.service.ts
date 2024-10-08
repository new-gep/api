import { Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import FindTimeSP from 'hooks/time';
@Injectable()
export class JobService {
  constructor(
    @Inject('JOB_REPOSITORY') 
    private jobRepository: Repository<Job>,
  ){}
  
  async create(createJobDto: CreateJobDto) {
    try{
      const time = FindTimeSP();
      createJobDto.create_at = time;

      const newJob = await this.jobRepository.save(createJobDto);

      if(newJob){
        return{
          status :201,
          message:'Vaga criada.',
        }
      }else{
        return{
          status :500,
          message:'Algo deu errado, tente mais tarde.',
        }
      }

    }catch(e){
      console.log(e)
      return{
        status :500,
        message:'Erro Interno.',
      }
    }
  }

  async findJobOpen(cnpj:string){
    const response = await this.jobRepository.find({ where: { CPF_collaborator: null, CNPJ_company: cnpj} });
    if(response){
      return {
        status:200,
        job:response
      }
    };
    return {
      status :409,
      message:'Registro não encontrado'
    };
  }

  findAll() {
    return `This action returns all job`;
  }

  async findOne(id: string) {
    try{
      const response = await this.jobRepository.findOne({
        where: { id: id }
      });
      if(response){
        return{
          status:200,
          job:response
        }
      }else{
        return{
          status:404,
          message:'Vaga não encontrada'
        }
      }

    }catch(e){
      console.log(e)
      return{
        status: 500,
        message:'Erro Interno.'
      }
    }
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    const time = FindTimeSP();
    updateJobDto.update_at = time;

    try{
      const response = await this.jobRepository.update(id,updateJobDto);
      if(response.affected === 1){
        return {
          status: 200,
          message:'Vaga atualizada com sucesso!'
        }
      }
      return {
        status:404,
        message:'Não foi possivel atualizar a vaga, algo deu errado!'
      }
    }catch(e){
      console.log(e)
      return {
        status:500,
        message:'Erro interno.'
      }
    }
  }

  remove(id: number) {
    return `This action removes a #${id} job`;
  }
}
