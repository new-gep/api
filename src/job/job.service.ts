import { Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { IsNull, Not, Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { UserService } from 'src/user/user.service';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
import { BucketService } from 'src/bucket/bucket.service';
import FindTimeSP from 'hooks/time';
import { UpadteJobDto } from './dto/update.job.dto';
import { CompanyService } from 'src/company/company.service';

@Injectable()
export class JobService {
  constructor(
    @Inject('JOB_REPOSITORY')
    private jobRepository: Repository<Job>,
    readonly userService: UserService,
    readonly collaboratorService: CollaboratorService,
    readonly bucketService: BucketService,
    readonly companyService: CompanyService,
  ){}
  

  async create(createJobDto: CreateJobDto) {
    try {
      const time = FindTimeSP();
      createJobDto.create_at = time;

      const newJob = await this.jobRepository.save(createJobDto);

      if (newJob) {
        return {
          status: 201,
          message: 'Vaga criada.',
        };
      } else {
        return {
          status: 500,
          message: 'Algo deu errado, tente mais tarde.',
        };
      }
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  };

  async uploadFile(upadteJobDto: UpadteJobDto, file: Express.Multer.File) {
    return await this.bucketService.UploadJob(
      file,
      upadteJobDto.name,
      upadteJobDto.signature,
      upadteJobDto.idJob,
      upadteJobDto?.dynamic,
    );
  };

  async UploadJobFileSignature(
    upadteJobDto: UpadteJobDto,
    file: Express.Multer.File,
  ) {
    return this.bucketService.UploadJobFileSignature(
      file,
      upadteJobDto.name,
      upadteJobDto.idJob,
      upadteJobDto.dynamic,
    );
  };

  async checkDocumentAdmissional(id: number) {
    return this.bucketService.checkJobBucketDocumentsObligation(id);
  };

  async findFile(id: number, name: string, signature: any, dynamic?: string) {
    return this.bucketService.findJob(id, name, signature, dynamic);
  };

  async findJobOpen(cnpj: string) {
    const response = await this.jobRepository.find({
      where: {
        CPF_collaborator: IsNull(),
        CNPJ_company: cnpj,
        delete_at: IsNull(),
      },
    });
    const formattedResponse = response.map((job) => {
      return {
        ...job,
        candidates: job.candidates
          ? JSON.parse(job.candidates)
          : job.candidates, // Analisa o JSON de candidates se for uma string
      };
    });

    if (response) {
      return {
        status: 200,
        job: formattedResponse,
      };
    }
    return {
      status: 409,
      message: 'Registro não encontrado',
    };
  };

  async findCollaboratorCompany(cnpj: string) {
    const collaboratorCompany = [] as any;
    const response = await this.jobRepository.find({
      where: { CNPJ_company: cnpj, CPF_collaborator: Not(IsNull()) },
    });

    if (response) {
      await Promise.all(
        response.map(async (job) => {
          const CPF = job.CPF_collaborator;
          const collaborator = await this.collaboratorService.findOne(CPF);
          if (collaborator.status === 200) {
            collaboratorCompany.push({
              ...collaborator,
              isDeleted: job.delete_at ? true : false,
            });
          }
        }),
      );

      const uniqueCollaborators = collaboratorCompany.reduce((acc, current) => {
        const existing = acc[current.CPF_collaborator];
        if (!existing || (existing.isDeleted && !current.isDeleted)) {
          acc[current.CPF_collaborator] = current;
        }
        return acc;
      }, {});

      return {
        status: 200,
        collaborator: Object.values(uniqueCollaborators),
        // job:
      };
    }

    return {
      status: 409,
      message: 'Registro não encontrado',
    };
  };

  async findAllAplicatedInJob(CPF_collaborator: string) {
    // Consulta todas as vagas abertas
    const openJobs = await this.jobRepository.find({
      where: { 
        candidates: Not(IsNull()),
        delete_at: IsNull(),
        CPF_collaborator: IsNull(),
       },
       // Certifica-se de que há candidatos na vaga
    });
  
    // Filtra as vagas onde o CPF aparece na lista de candidatos
    const jobsWithCpf = openJobs.filter((job) =>
      JSON.parse(job.candidates).some((candidate) => String(candidate.cpf) === String(CPF_collaborator)) // Verifica se há um candidato com o CPF na lista
    );
  
    if (jobsWithCpf.length > 0) {
      return {
        status: 200,
        message: `O CPF ${CPF_collaborator} está aplicado em ${jobsWithCpf.length} vaga(s) aberta(s).`,
        jobs: jobsWithCpf, // Retorna todas as vagas onde o CPF foi encontrado
      };
    }
  
    return {
      status: 404,
      message: `O CPF ${CPF_collaborator} não foi encontrado em nenhuma vaga aberta.`,
    };
  }
  
  

  async findAll() {
    try {
      
      const response = await this.jobRepository.find({ where: { delete_at: IsNull(), CPF_collaborator: IsNull() } });

      const enrichedJobs = await Promise.all(
        response.map(async (job) => {
          const companyResponse = await this.companyService.findOne(job.CNPJ_company);
          if (companyResponse.status === 200) {
            //@ts-ignore
            job.company = companyResponse.company;
            // Adicionando o novo campo que vem do banco de `company`
          }
          return job; // Retorna o job enriquecido
        })
      );

      if(response){
        return {
          status:200,
          job   :enrichedJobs,
        }
      };
      return {
        status :409,
        message:'Registro não encontrado'
      };

    } catch (error) {
      return {
        status :500,
        message:'Erro no servidor'
      };
    }
  };



  async findProcessAdmissional(cnpj: string) {
    try {
      const response = await this.jobRepository.find({
        where: {
          CPF_collaborator: IsNull(),
          CNPJ_company: cnpj,
          delete_at: IsNull(),
        },
      });
      const candidatesWithStep = await Promise.all(
        response.flatMap(async (job) => {
          if (!job.candidates) return []; // Retorna array vazio se não houver candidatos
          const candidates = JSON.parse(job.candidates); // Parse para objeto JSON
          for (const candidate of candidates) {
            const response = await this.collaboratorService.findOne(
              candidate.cpf,
            ); // Busca os dados pelo CPF
            if (response.status === 200) {
              delete response.collaborator.password;
              delete response.collaborator.CPF;
              Object.assign(candidate, response.collaborator); // Adiciona os dados diretamente ao objeto
            }
          }

          return Promise.all(
            candidates.map(async (candidate) => {
              const picture = await this.bucketService.getFileFromBucket(
                `collaborator/${candidate.cpf}/Picture`,
              );
              return {
                ...candidate,
                picture: picture.base64Data,
                id: job.id,
                function: job.function,
                salary: job.salary,
                contract: job.contract,
                update_atJob: job.update_at,
              };
            }),
          );
        }),
      );
      const filteredCandidates = candidatesWithStep
        .flat()
        .filter((candidate) => candidate.step !== '0');
      const stepCounts = filteredCandidates.reduce((acc, candidate) => {
        const step = `step${candidate.step}`;
        acc[step] = (acc[step] || 0) + 1;
        return acc;
      }, {});

      return {
        status: 200,
        candidates: filteredCandidates,
        counts: stepCounts,
      };
    } catch (e) {
      return {
        status: 500,
        message: 'Unexpected Error',
      };
    }
  };

  async findOne(id: string) {
    try {
      const response = await this.jobRepository.findOne({
        where: { id: id },
      });
      if (response) {
        const user = await this.userService.findOne(response.user_create);
        response.candidates = JSON.parse(response.candidates);
        if (response.candidates) {
          for (let index = 0; index < response.candidates.length; index++) {
            const candidate: any = response.candidates[index];
            const collaborator: any = await this.collaboratorService.findOne(
              candidate.cpf,
            );
            const picture: any = await this.bucketService.getFileFromBucket(
              `collaborator/${candidate.cpf}/Picture`,
            );
            //@ts-ignore
            response.candidates[index] = {
              ...candidate,
              name: collaborator.collaborator.name,
              picture: picture.base64Data,
            };
          }
        } else {
          response.candidates = null;
        }
        return {
          status: 200,
          job: response,
          userCreate: user.user,
        };
      } else {
        return {
          status: 404,
          message: 'Vaga não encontrada',
        };
      }
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro Interno.',
      };
    }
  };

  async update(id: string, updateJobDto: UpdateJobDto) {
    const time = FindTimeSP();
    updateJobDto.update_at = time;
    try {
      const response = await this.jobRepository.update(id, updateJobDto);
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Vaga atualizada com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel atualizar a vaga, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  };

  async removeDocumentDynamic(id: number, name: string) {
    return this.bucketService.DeleteDocumentDynamic(id, name);
  };

  async remove(id: string) {
    try {
      const time = FindTimeSP();
      const propsDelete = {
        delete_at: time,
      };

      const response = await this.jobRepository.update(id, propsDelete);
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Vaga deletada com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel deletada a vaga, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  };
}
