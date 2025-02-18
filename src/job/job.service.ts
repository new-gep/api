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
import { AbsenceService } from 'src/absence/absence.service';
import { UploadAbsenceDto } from './dto/upload-absence.dto';
import { CreateAbsenceDto } from 'src/absence/dto/create-absence.dto';
@Injectable()
export class JobService {
  constructor(
    @Inject('JOB_REPOSITORY')
    private jobRepository: Repository<Job>,
    readonly userService: UserService,
    readonly collaboratorService: CollaboratorService,
    readonly bucketService: BucketService,
    readonly companyService: CompanyService,
    readonly absenceService: AbsenceService,
  ) {}

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
  }

  async uploadFile(upadteJobDto: UpadteJobDto, file: Express.Multer.File) {
    return await this.bucketService.UploadJob(
      file,
      upadteJobDto.name,
      upadteJobDto.signature,
      upadteJobDto.idJob,
      upadteJobDto?.dynamic,
    );
  }

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
  }

  async UploadJobFileAbsence(uploadAbsenceDto: UploadAbsenceDto, file: Express.Multer.File) {
    const createAbsenceDto: CreateAbsenceDto = {
      id_work: Number(uploadAbsenceDto.id_work),
      name: uploadAbsenceDto.name,
      observation: null,
      status: null,
      CPF_collaborator: uploadAbsenceDto.CPF_collaborator,
      create_at: null,
    };

    const response = await this.absenceService.create(createAbsenceDto);
    console.log(response)
    if (response.status === 201) {
      uploadAbsenceDto.name = `${uploadAbsenceDto.name}_${response.absence.id}`;
      const uploadResponse = await this.absenceService.UploadJobFileAbsence(
        file,
        uploadAbsenceDto.name,
        uploadAbsenceDto.year,
        uploadAbsenceDto.month,
        uploadAbsenceDto.id_work,
        uploadAbsenceDto.type
      );
      return uploadResponse;
    }
  }

  async checkDocumentAdmissional(id: number) {
    return this.bucketService.checkJobAdmissionBucketDocumentsObligation(id);
  }

  async checkDocumentDismissal(id: number) {
    return this.bucketService.checkJobDismissalBucketDocumentsObligation(id);
  }

  async findFile(id: number, name: string, signature: any, dynamic?: string) {
    return this.bucketService.findJob(id, name, signature, dynamic);
  }

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
  }

  async findAllJobsCollaborator(cpf: string) {
    const response = await this.jobRepository.find({
      where: {
        CPF_collaborator: cpf,
        delete_at: IsNull(),
      },
    });

    if (response) {
      return {
        status: 200,
        job: response,
      };
    }
    return {
      status: 409,
      message: 'Registro não encontrado',
    };
  }

  async findCollaboratorCompany(cnpj: string) {
    const collaboratorCompany = [] as any;
    const response = await this.jobRepository.find({
      where: [
        { CNPJ_company: cnpj, CPF_collaborator: Not(IsNull()) }, 
      ],
      order: {
        delete_at: 'DESC', // Para garantir que, entre os deletados, o mais recente seja priorizado
        update_at: 'DESC' // Caso queira priorizar o mais recente em termos de atualização, caso seja necessário
      }
    });
    // console.log(response)
    const seenCpfs = new Set();
    const uniqueJobs = response.filter(job => {
      // Se o CPF já foi visto, verifica se o registro atual tem prioridade
      if (seenCpfs.has(job.CPF_collaborator)) {
        // Encontra o registro existente com o mesmo CPF
        const existingJob = response.find(j => j.CPF_collaborator === job.CPF_collaborator);
        
        // Se o registro atual tem `demission: null` e o existente não, substitui
        if (job.demission === null && existingJob.demission !== null) {
          // Remove o registro existente e adiciona o atual
          const index = uniqueJobs.indexOf(existingJob);
          uniqueJobs.splice(index, 1);
          return true;
        }
        // Caso contrário, descarta o registro atual
        return false;
      } else {
        // Se o CPF não foi visto, adiciona ao Set e mantém o registro
        seenCpfs.add(job.CPF_collaborator);
        return true;
      }
    });

    if (uniqueJobs) {
      await Promise.all(
        uniqueJobs.map(async (job) => {
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

      

      return {
        status: 200,
        collaborator: collaboratorCompany,
      };
    }

    return {
      status: 409,
      message: 'Registro não encontrado',
    };

  }

  async findAllAplicatedInJob(CPF_collaborator: string) {
    // Consulta todas as vagas abertas
    const openJobs = await this.jobRepository.find({
      where: {
        candidates: Not(IsNull()),
        delete_at: IsNull(),
        CPF_collaborator: IsNull(),
      },
    });
  
    // Filtra todas as vagas onde o candidato está aplicado (independente do step)
    const jobsWithCpfAll = openJobs.filter((job) => {
      const candidates = JSON.parse(job.candidates);
      return candidates.some(
        (candidate) => String(candidate.cpf) === String(CPF_collaborator)
      );
    });
  
    // Filtra as vagas onde o candidato possui step > 0
    const jobsWithCpfStepGreaterThanZero = jobsWithCpfAll.filter((job) => {
      let candidates = JSON.parse(job.candidates);
      // console.log('Candidatos da vaga antes do filtro:', candidates);
      
      // Filtra apenas o candidato com o CPF específico
      candidates = candidates.filter(candidate => String(candidate.cpf) === String(CPF_collaborator));
      
      // Atualiza a lista de candidatos na vaga para conter apenas o candidato específico
      job.candidates = JSON.stringify(candidates);
      
      // console.log('Candidatos da vaga após filtro:', candidates);
      
      // Verifica se o candidato tem step > 0
      return candidates.some(candidate => candidate.step > 0);
    });
  
    // console.log('jobsWithCpfStepGreaterThanZero', jobsWithCpfStepGreaterThanZero.length);
    // console.log('jobsWithCpfAll', jobsWithCpfAll.length);
  

    // Se existir ao menos uma vaga com step > 0, retorna apenas essas vagas
    if (jobsWithCpfStepGreaterThanZero.length > 0) {
      console.log('aq')
      return {
        status: 200,
        message: `O CPF ${CPF_collaborator} está aplicado em ${jobsWithCpfStepGreaterThanZero.length} vaga(s) com step maior que zero.`,
        jobs: jobsWithCpfStepGreaterThanZero,
        processAdmission: true,
      };
    }
  
    // Caso não haja nenhuma vaga com step > 0, mas o candidato esteja aplicado em alguma vaga,
    // retorna todas as vagas em que o candidato está
    if (jobsWithCpfAll.length > 0) {
      return {
        status: 200,
        message: `O CPF ${CPF_collaborator} está aplicado em ${jobsWithCpfAll.length} vaga(s), mas nenhuma com step maior que zero.`,
        jobs: jobsWithCpfAll,
        processAdmission: false,
      };
    }
  
    // Caso o candidato não esteja aplicado em nenhuma vaga aberta
    return {
      status: 404,
      message: `O CPF ${CPF_collaborator} não foi encontrado em nenhuma vaga aberta.`,
    };
  }

  async jobServices(id: any, typeService: any, year: any, month: any) {
    return await this.bucketService.findServices(id, typeService, year, month)
  }

  async findAll() {
    try {

      const response = await this.jobRepository.find({
        where: { delete_at: IsNull(), CPF_collaborator: IsNull() },
      });

      const enrichedJobs = await Promise.all(
        response.map(async (job) => {
          const companyResponse = await this.companyService.findOne(
            job.CNPJ_company,
          );
          if (companyResponse.status === 200) {
            //@ts-ignore
            job.company = companyResponse.company;
            // Adicionando o novo campo que vem do banco de `company`
          }
          return job; // Retorna o job enriquecido
        }),
      );

      if (response) {
        return {
          status: 200,
          job: enrichedJobs,
        };
      }
      return {
        status: 409,
        message: 'Registro não encontrado',
      };
    } catch (error) {
      return {
        status: 500,
        message: 'Erro no servidor',
      };
    }
  }

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
        response.map(async (job) => {
          if (!job.candidates) return []; // Retorna array vazio se não houver candidatos

          // Tenta fazer o parse de job.candidates
          let candidates;
          try {
            candidates = JSON.parse(job.candidates);
          } catch (error) {
            console.error(
              `Erro ao fazer JSON.parse em job.candidates para job ID ${job.id}:`,
              error,
            );
            return []; // Retorna vazio em caso de erro no parse
          }

          // Processa os candidatos
          await Promise.all(
            candidates.map(async (candidate) => {
              try {
                const collaboratorResponse =
                  await this.collaboratorService.findOne(candidate.cpf);
                if (collaboratorResponse?.status === 200) {
                  // Atualiza os dados do candidato com os dados do colaborador
                  delete collaboratorResponse.collaborator.password;
                  delete collaboratorResponse.collaborator.CPF;

                  Object.assign(candidate, {
                    ...collaboratorResponse.collaborator, // Adiciona os dados do colaborador
                    step: candidate.step || 0, // Mantém o step original
                    status: candidate.status ?? null, // Mantém status original ou null
                  });
                }
              } catch (error) {
                console.error(
                  `Erro ao buscar colaborador para CPF ${candidate.cpf}:`,
                  error,
                );
              }
            }),
          );

          // Adiciona os dados complementares aos candidatos
          return Promise.all(
            candidates.map(async (candidate) => {
              try {
                const pictureResponse =
                  await this.bucketService.getFileFromBucket(
                    `collaborator/${candidate.cpf}/Picture`,
                  );

                return {
                  ...candidate,
                  picture: pictureResponse?.base64Data || null, // Adiciona a imagem (ou null)
                  id: job.id,
                  function: job.function,
                  salary: job.salary,
                  contract: job.contract,
                  update_atJob: job.update_at,
                };
              } catch (error) {
                console.error(
                  `Erro ao buscar picture para CPF ${candidate.cpf}:`,
                  error,
                );
                return null; // Retorna null em caso de erro
              }
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
  }

  async findProcessDemissional(cnpj: string) {
    try {
      const response = await this.jobRepository.find({
        where: {
          CPF_collaborator: Not(IsNull()),
          CNPJ_company: cnpj,
          delete_at: IsNull(),
          motion_demission: Not(IsNull()),
        },
      });

      const collaboratorsInProcess = await Promise.all(
        response.flatMap(async (job) => {
          const response = await this.collaboratorService.findOne(
            job.CPF_collaborator,
          );

          if (job.demission) {
            try {
              job.demission = JSON.parse(job.demission); // Converte demission para JSON
              //@ts-ignore
              if (job.demission.step == 4) {
                return null; // Remove o job se o step for igual a 4
              }
            } catch (error) {
              console.error('Erro ao fazer JSON.parse em demission:', error);
              job.demission = null; // Define como null em caso de erro
            }
          }

          if (response.status === 200) {
            delete response.collaborator.password;
            delete response.collaborator.CPF;
            //@ts-ignore
            response.collaborator.picture = response.picture;
            return {
              ...job,
              collaborator: response.collaborator,
            };
          }
        }),
      );

      const stepCounts = collaboratorsInProcess.reduce((acc, collaborator) => {
        try {
          // Acessar o campo "demission" diretamente
          const demission = collaborator.demission;
      
          // Obter o step e criar a chave dinamicamente
          if (demission && typeof demission === 'object') {
            //@ts-ignore
            const step = `step${demission.step}`;
            // Incrementar o contador para o step correspondente
            acc[step] = (acc[step] || 0) + 1;
          }
        } catch (error) {
          console.error("Erro ao processar demission:", collaborator.demission, error);
        }
      
        return acc;
      }, {});

      return {
        status: 200,
        job: collaboratorsInProcess,
        counts: stepCounts,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Unexpected Error',
      };
    }
  }

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
  }

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
  }

  async removeDocumentDynamic(id: number, name: string, where?:string) {
    return this.bucketService.DeleteDocumentDynamic(id, name, where);
  }

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
  }
}
