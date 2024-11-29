import { Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { IsNull, Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { UserService } from 'src/user/user.service';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
import { BucketService } from 'src/bucket/bucket.service';
import FindTimeSP from 'hooks/time';
@Injectable()
export class JobService {
  constructor(
    @Inject('JOB_REPOSITORY') 
    private jobRepository: Repository<Job>,
    readonly userService: UserService,
    readonly collaboratorService: CollaboratorService,
    readonly bucketService: BucketService,
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
    const response = await this.jobRepository.find({ where: { CPF_collaborator: IsNull(), CNPJ_company: cnpj, delete_at: IsNull()} });
    const formattedResponse = response.map(job => {
      return {
        ...job,
        candidates: job.candidates ? JSON.parse(job.candidates) : job.candidates, // Analisa o JSON de candidates se for uma string
      };
    });
  
    if(response){
      return {
        status:200,
        job   :formattedResponse,
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

  async findProcessAdmissional(cnpj:string){
    const response = await this.jobRepository.find({ where: { CPF_collaborator: IsNull(), CNPJ_company: cnpj, delete_at: IsNull()} });
    const candidatesWithStep1 = await Promise.all(
      response.flatMap(async job => {
        if (!job.candidates) return []; // Retorna array vazio se não houver candidatos
    
        const candidates = JSON.parse(job.candidates); // Parse para objeto JSON
        return Promise.all(
          candidates.map(async candidate => {
            const picture = await this.bucketService.getFileFromBucket(`collaborator/${candidate.cpf}/Picture`);
            return {
              ...candidate,
              picture:picture.base64Data, // Inclui a imagem no resultado
              id: job.id,
              function: job.function,
              salary: job.salary,
              contract: job.contract,
            };
          })
        );
      })
    );
    
    // Filtrar candidatos com step === "1"
    const filteredCandidates = candidatesWithStep1.flat().filter(candidate => candidate.step !== "0");
    return filteredCandidates
    

  }

  async findOne(id: string) {
    try{
      const response = await this.jobRepository.findOne({
        where: { id: id }
      });
      if(response){
        const user   = await this.userService.findOne(response.user_create)
        response.candidates = JSON.parse(response.candidates)
        for (let index = 0; index < response.candidates.length; index++) {
          const candidate:any = response.candidates[index];
          const collaborator:any = await this.collaboratorService.findOne(candidate.cpf);
          const picture:any = await this.bucketService.getFileFromBucket(`collaborator/${candidate.cpf}/Picture`);
          //@ts-ignore
          response.candidates[index] = {
            ...candidate,                
            name   : collaborator.collaborator.name, 
            picture:picture.base64Data,
          };
        };
        return{
          status:200,
          job:response,
          userCreate:user.user
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

  async remove(id: string) {
    try{
      const time = FindTimeSP();
      const propsDelete = {
        delete_at: time
      };
  
      const response = await this.jobRepository.update(id,propsDelete);
      if(response.affected === 1){
        return {
          status: 200,
          message:'Vaga deletada com sucesso!'
        }
      }
      return {
        status:404,
        message:'Não foi possivel deletada a vaga, algo deu errado!'
      }
    }catch(e){
      console.log(e)
      return {
        status:500,
        message:'Erro interno.'
      }
    }

  }
}
