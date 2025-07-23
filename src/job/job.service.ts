import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { IsNull, Not, Repository, Like } from 'typeorm';
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
import { ServiceService } from 'src/service/service.service';
import { Console } from 'node:console';
import { AnnouncementService } from 'src/announcement/announcement.service';

@Injectable()
export class JobService {
  constructor(
    @Inject('JOB_REPOSITORY')
    private jobRepository: Repository<Job>,
    readonly userService: UserService,
    readonly collaboratorService: CollaboratorService,
    readonly bucketService: BucketService,
    readonly announcementService: AnnouncementService,
    readonly companyService: CompanyService,
    readonly absenceService: AbsenceService,
    readonly ServiceService: ServiceService,

    private serviceService: ServiceService,
  ) {}

  async create(createJobDto: CreateJobDto) {
    try {
      const time = FindTimeSP();
      createJobDto.create_at = time;
      const {
        default: defaultJob,
        benefits,
        skills,
        localities,
        ...rest
      } = createJobDto;

      // Limpa salário e CEP
      const cleanedSalary = defaultJob.salary.replace(/[^\d]/g, '');
      const cleanedCep = defaultJob.cep.replace('-', '');

      // Filtra somente os benefits ativos
      const activeBenefits =
        benefits?.filter((b) => b.active).map((b) => b.name) || [];

      // Extrai só os nomes das skills
      const skillNames = skills?.map((s) => s.name) || [];

      // Base da vaga tratada
      const baseJob = {
        ...defaultJob,
        salary: cleanedSalary,
        cep: cleanedCep,
        benefits: JSON.stringify(activeBenefits),
        skills: JSON.stringify(skillNames),
        create_at: time,
        user_create: createJobDto.user_create,
        CNPJ_company: createJobDto.CNPJ_company,
      };

      // Verifica localities para duplicar ou não
      const jobsToCreate = [
        baseJob, // sempre inclui o job padrão
        ...(localities && localities.length > 0
          ? localities
              .filter((l) => l?.locality && l?.cep)
              .map((l) => ({
                ...baseJob,
                locality: l.locality,
                cep: l.cep.replace('-', ''),
              }))
          : []),
      ]; // só 1 se não tiver localities

      // Salva todas as vagas
      const savedJobs = await this.jobRepository.save(jobsToCreate);

      return {
        status: 201,
        message: `${savedJobs.length} vaga(s) criada(s).`,
      };
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

  async UploadJobFileSignature(upadteJobDto: UpadteJobDto) {
    return this.bucketService.UploadJobFileSignature(
      upadteJobDto.name,
      upadteJobDto.idJob,
      upadteJobDto.dynamic,
      upadteJobDto.pages,
    );
  }

  async UploadJobFileAbsence(
    uploadAbsenceDto: UploadAbsenceDto,
    file: Express.Multer.File,
  ) {
    const createAbsenceDto: CreateAbsenceDto = {
      id_work: Number(uploadAbsenceDto.id_work),
      name: uploadAbsenceDto.name,
      observation: null,
      status: null,
      CPF_collaborator: uploadAbsenceDto.CPF_collaborator,
      create_at: null,
      date: uploadAbsenceDto.date,
    };
    const response = await this.absenceService.create(createAbsenceDto);
    if (response.status === 201) {
      //@ts-ignore
      uploadAbsenceDto.name = `${uploadAbsenceDto.name}_${response.absence.id}`;
      const uploadResponse = await this.absenceService.UploadJobFileAbsence(
        file,
        uploadAbsenceDto.name,
        uploadAbsenceDto.year,
        uploadAbsenceDto.month,
        uploadAbsenceDto.id_work,
        uploadAbsenceDto.type,
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

  async findActualOrLastCompany(cpf: string) {
    try {
      const response = await this.collaboratorService.findOne(cpf);
      if (response.status === 200) {
        if (response?.collaborator?.id_work) {
          const job = await this.jobRepository.findOne({
            where: { id: response.collaborator.id_work.id },
            relations: ['CNPJ_company'], // importante: carrega os dados da empresa vinculada
          });
          return {
            status: 200,
            company: { ...job, status: 'actual' },
          };
        }
      } else {
        return {
          status: 404,
          message: 'Colaborador não encontrado',
        };
      }

      const query = `
      SELECT 
        j.*,
        JSON_OBJECT(
          'CNPJ', c.CNPJ,
          'company_name', c.company_name,
          'isVisible', c.isVisible,
          'email', c.email,
          'type_account', c.type_account,
          'state_registration', c.state_registration,
          'municipal_registration', c.municipal_registration,
          'responsible', c.responsible,
          'phone', c.phone,
          'zip_code', c.zip_code,
          'street', c.street,
          'district', c.district,
          'city', c.city,
          'uf', c.uf,
          'state', c.state,
          'number', c.number,
          'create_at', c.create_at,
          'update_at', c.update_at,
          'delete_at', c.delete_at
        ) AS CNPJ_company,
        'demission_finish_last' AS process
      FROM job j
      JOIN company c ON c.CNPJ = j.CNPJ_company
      WHERE j.CPF_collaborator = ?
        AND j.delete_at IS NULL
        AND j.demission IS NOT NULL
        AND JSON_VALID(j.demission)
        AND JSON_EXTRACT(j.demission, '$.step') = 'finish'
      ORDER BY j.create_at DESC
      LIMIT 1;
      `;

      const result = await this.jobRepository.query(query, [cpf]);
      if (result.length === 0) {
        return {
          status: 404,
          message: 'Nenhuma demissão encontrada.',
        };
      }

      return {
        status: 200,
        company: { ...result[0], status: 'last' },
      };
    } catch (e) {
      return {
        status: 500,
        message: 'Erro ao buscar última demissão',
        error: e.message || e.toString(),
      };
    }
  }

  async findProcess(cpf: string) {
    try {
      const queryAdmission = `
        SELECT 
          job.*, 
          'admission' AS process,
          jt.step AS step
        FROM job
        JOIN JSON_TABLE(
          CAST(job.candidates AS JSON),
          '$[*]' COLUMNS (
            cpf VARCHAR(20) PATH '$.cpf',
            step INT PATH '$.step'
          )
        ) AS jt ON TRUE
        WHERE 
          job.delete_at IS NULL
          AND job.CPF_collaborator IS NULL
          AND job.candidates IS NOT NULL
          AND jt.cpf = ?
          AND jt.step IN (1, 2, 3);
      `;

      const responseAdmission = await this.jobRepository.query(queryAdmission, [
        cpf,
      ]);

      const queryDemission = `
        SELECT 
          job.*, 
          'demission' AS process,
          CAST(JSON_UNQUOTE(JSON_EXTRACT(job.demission, '$.step')) AS UNSIGNED) AS step
        FROM job
        WHERE 
          job.delete_at IS NULL
          AND job.CPF_collaborator = ?
          AND job.motion_demission IS NOT NULL
          AND job.demission IS NOT NULL
          AND JSON_VALID(job.demission)
          AND (
            CAST(JSON_UNQUOTE(JSON_EXTRACT(job.demission, '$.step')) AS UNSIGNED) IN (1, 2, 3)
            OR JSON_EXTRACT(job.demission, '$.step') IN ('1', '2', '3')
          );
      `;

      const responseDemission = await this.jobRepository.query(queryDemission, [
        cpf,
      ]);

      // Unir os dois arrays removendo duplicatas por 'id'
      const combined = [...responseAdmission, ...responseDemission];
      const uniqueJobsMap = new Map();

      for (const job of combined) {
        uniqueJobsMap.set(job.id, job);
      }

      const uniqueJobs = Array.from(uniqueJobsMap.values());

      return {
        status: 200,
        data: uniqueJobs,
      };
    } catch (error) {
      // Trate o erro conforme sua necessidade
      return {
        status: 500,
        message: 'Erro ao buscar processos',
        error: error.message || error,
      };
    }
  }

  async findAllService(cpf: string) {
    const query = `
      SELECT *
      FROM (
        SELECT
          job.id,
          'job' AS source,
          job.candidates,
          job.CPF_collaborator,
          NULL AS CPF_responder,
          'fix' AS service
        FROM job
        WHERE 
          job.delete_at IS NULL
          AND job.CPF_collaborator IS NULL
          AND (
            job.candidates IS NULL
            OR (
              JSON_VALID(job.candidates) = 1
              AND (
                JSON_LENGTH(job.candidates) = 0
                OR (
                  NOT EXISTS (
                    SELECT 1
                    FROM JSON_TABLE(
                      job.candidates,
                      '$[*]' COLUMNS (
                        cpf VARCHAR(20) PATH '$.cpf'
                      )
                    ) AS jt
                    WHERE jt.cpf = ?
                  )
                  AND NOT EXISTS (
                    SELECT 1
                    FROM JSON_TABLE(
                      job.candidates,
                      '$[*]' COLUMNS (
                        step INT PATH '$.step'
                      )
                    ) AS jt
                    WHERE jt.step IS NOT NULL AND jt.step != 0
                  )
                )
              )
            )
          )

        UNION ALL

        SELECT
          announcement.id,
          'announcement' AS source,
          announcement.candidates,
          NULL AS CPF_collaborator,
          announcement.CPF_responder,
          'flex' AS service
        FROM announcement
        WHERE 
          announcement.delete_at IS NULL
          AND announcement.CPF_responder IS NULL
          AND (
            announcement.candidates IS NULL
            OR (
              JSON_VALID(announcement.candidates) = 1
              AND (
                JSON_LENGTH(announcement.candidates) = 0
                OR NOT EXISTS (
                  SELECT 1
                  FROM JSON_TABLE(
                    announcement.candidates,
                    '$[*]' COLUMNS (
                      cpf VARCHAR(20) PATH '$.cpf'
                    )
                  ) AS jt
                  WHERE jt.cpf = ?
                )
              )
            )
          )
          AND announcement.CPF_creator COLLATE utf8mb4_general_ci != ? COLLATE utf8mb4_general_ci
      ) AS combined_results
      LIMIT 20;
    `;
    const response = await this.jobRepository.query(query, [cpf, cpf, cpf]);
    if (response.length === 0) {
      return {
        status: 404,
        message: 'Nenhuma vaga encontrada para o CPF informado.',
      };
    }
    const services = await Promise.all(
      response.map(async (item: any) => {
        if (item.source === 'job') {
          const job = await this.jobRepository.findOne({
            where: { id: item.id },
            relations: ['CNPJ_company'],
          });
          return {
            service: 'fix',
            job,
          };
        } else if (item.source === 'announcement') {
          const announcement = await this.announcementService.findOneById(
            item.id,
          );
          return {
            service: 'flex',
            announcement,
          };
        }
      }),
    );
    return {
      status: 200,
      data: services,
    };
  }

  async FindAllCandidacy(cpf: string) {
    try {
      const query = `
        SELECT 
          filtered_job.id,
          'job' AS source,
          filtered_job.candidates,
          filtered_job.CPF_collaborator,
          NULL AS CPF_responder,
          NULL AS proposal,
          'fix' AS service
        FROM (
          SELECT * 
          FROM job
          WHERE 
            CPF_collaborator IS NULL
            AND delete_at IS NULL
            AND candidates IS NOT NULL
            AND JSON_VALID(candidates) = 1
        ) AS filtered_job
        JOIN JSON_TABLE(
          CAST(filtered_job.candidates AS JSON),
          '$[*]' COLUMNS (
            cpf VARCHAR(20) PATH '$.cpf',
            step_str VARCHAR(10) PATH '$.step'
          )
        ) AS jt_match
        ON jt_match.cpf = ?
          AND jt_match.step_str = '0'
        WHERE NOT EXISTS (
          SELECT 1
          FROM JSON_TABLE(
            CAST(filtered_job.candidates AS JSON),
            '$[*]' COLUMNS (
              step_str VARCHAR(10) PATH '$.step'
            )
          ) AS jt_step
          WHERE jt_step.step_str != '0'
        )
        
        UNION ALL
        
        SELECT 
          announcement.id,
          'announcement' AS source,
          announcement.candidates,
          NULL AS CPF_collaborator,
          announcement.CPF_responder,
          jt_ann.proposal,
          'flex' AS service
        FROM (
          SELECT * 
          FROM announcement
          WHERE 
            delete_at IS NULL
            AND CPF_responder IS NULL
            AND candidates IS NOT NULL
            AND JSON_VALID(candidates) = 1
        ) AS announcement
        JOIN JSON_TABLE(
          CAST(announcement.candidates AS JSON),
          '$[*]' COLUMNS (
            cpf VARCHAR(20) PATH '$.cpf',
            proposal BOOLEAN PATH '$.propostal'
          )
        ) AS jt_ann
        ON jt_ann.cpf = ?
        WHERE jt_ann.proposal IS NULL OR jt_ann.proposal = FALSE;
      `;
      const response = await this.jobRepository.query(query, [cpf, cpf]);
      if (response.length === 0) {
        return {
          status: 404,
          message: 'Nenhuma candidatura encontrada para o CPF informado.',
        };
      }

      const tasks = await Promise.all(
        response.map(async (item: any) => {
          if (item.source === 'job') {
            const job = await this.jobRepository.findOne({
              where: { id: item.id },
              relations: ['CNPJ_company'],
            });
            return {
              service: 'fix',
              job,
            };
          } else if (item.source === 'announcement') {
            const announcement = await this.announcementService.findOneById(
              item.id,
            );
            return {
              service: 'flex',
              announcement,
            };
          }
        }),
      );

      return {
        status: 200,
        data: tasks,
      };
    } catch (e) {
      console.log(e);
    }
  }

  async findHistory(cpf: string) {
    try {
      const query = `
      SELECT job.*, 'demission_finish' AS process
      FROM job
      WHERE CPF_collaborator = ?
        AND delete_at IS NULL
        AND demission IS NOT NULL
        AND JSON_VALID(demission)
        AND JSON_EXTRACT(demission, '$.step') = 'finish';
    `;

      const response = await this.jobRepository.query(query, [cpf]);

      return {
        status: 200,
        data: response,
      };
    } catch (error) {
      return {
        status: 500,
        message: 'Erro ao buscar demissão finalizada',
        error: error.message || error,
      };
    }
  }

  async findFile(id: number, name: string, signature: any, dynamic?: string) {
    return this.bucketService.findJob(id, name, signature, dynamic);
  }

  async FindAllServiceByMonthAndYear(
    cnpj: string,
    month: string,
    year: string,
    type: string,
  ) {
    try {
      const uniqueJobs = [];
      const uniqueSignature = [];

      const response = await this.serviceService.FindAllByMonthAndYear(
        cnpj,
        month,
        year,
        type,
      );
      if (!response || response.status == 404) {
        return response;
      }

      for (const item of response.services) {
        const [action, type, year_file, month_file, id_service] =
          item.name.split('_');

        if (
          year === year_file &&
          month === month_file &&
          action.toLowerCase() !== 'signature'
        ) {
          const responseJob = await this.jobRepository.findOne({
            //@ts-ignore
            where: { id: item.id_work },
            relations: ['CNPJ_company'],
          });
          //@ts-ignore
          if (responseJob && responseJob.status === 200) {
            const responseCollaborator = await this.collaboratorService.findOne(
              //@ts-ignore
              responseJob.job.CPF_collaborator.CPF,
            );
            if (responseJob.CNPJ_company.CNPJ !== cnpj) {
              continue;
            }
            const ServiceComplet = {
              //@ts-ignore
              job: responseJob.job,
              collaborator: responseCollaborator.collaborator,
              picture: responseCollaborator.picture,
            };
            const pictureService = await this.bucketService.findOneService(
              item.id_work,
              item.type,
              year,
              month,
              item.name,
            );
            const newName = item.name.replace(/^[^_]+/, 'Full');
            const pictureFull = await this.bucketService.findOneService(
              item.id_work,
              type,
              year,
              month,
              newName,
            );

            if (pictureService.status === 200 && pictureFull.status === 200) {
              //@ts-ignore
              ServiceComplet.service = [
                { [item.name]: { item, pictureService, pictureFull } },
              ];
            } else if (
              pictureService.status === 200 &&
              pictureFull.status !== 200
            ) {
              //@ts-ignore
              ServiceComplet.service = [
                { [item.name]: { item, pictureService } },
              ];
            } else {
              //@ts-ignore
              ServiceComplet.service = [{ [item.name]: { item } }];
            }

            uniqueJobs.push(ServiceComplet);
          }
        }

        if (
          action.toLowerCase() === 'signature' &&
          year === year_file &&
          month === month_file
        ) {
          //@ts-ignore
          const responseJob = await this.findOne(item.id_work.toString());
          //@ts-ignore
          if (responseJob.job.CNPJ_company !== cnpj) {
            continue;
          }

          uniqueSignature.push({ true_id: id_service, service: item });
          continue;
        }
      }

      if (uniqueJobs.length <= 0) {
        return {
          status: 404,
          message: 'service not found',
        };
      }

      if (uniqueSignature.length > 0) {
        for (const item of uniqueSignature) {
          for (const unique of uniqueJobs) {
            if (String(unique.job.id) === String(item.service.id_work)) {
              unique.signature = item;
              const response = await this.bucketService.findOneService(
                unique.job.id,
                type,
                year,
                month,
                item.service.name,
              );

              if (response.status === 200) {
                unique.signature.picture = response;
              }
            }
          }
        }
      }

      // const uniqueJobsArray = uniqueJobs.filter((job, index, self) =>
      //   index === self.findIndex((c) => c.collaborator.cpf === job.collaborator.cpf)
      // );

      const mergedJobs = uniqueJobs.reduce((acc, job) => {
        const existing = acc.find(
          (c) => c.collaborator.cpf === job.collaborator.cpf,
        );

        if (existing) {
          // Se já existe, adiciona diretamente o conteúdo de job.service
          const newService = Array.isArray(job.service)
            ? job.service
            : [job.service];
          existing.service.push(...newService);

          // Atualiza o signature, se existir
          if (job.signature) {
            existing.signature = job.signature;
          }
        } else {
          // Se não existe, inicia um novo item com job.service como um array plano
          acc.push({
            ...job,
            service: Array.isArray(job.service) ? job.service : [job.service],
          });
        }

        return acc;
      }, []);

      return {
        status: 200,
        collaborators: mergedJobs,
      };
    } catch (error) {
      console.log('error', error);
      return {
        status: 500,
        message: 'Error to find service',
      };
    }
  }

  async findJobOpen(cnpj: string) {
    const response = await this.jobRepository.find({
      where: {
        CPF_collaborator: IsNull(),
        CNPJ_company: { CNPJ: cnpj },
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

  async findAllOpen(job: string) {
    const response = await this.jobRepository.find({
      where: {
        CPF_collaborator: IsNull(),
        delete_at: IsNull(),
        function: Like(`%${job}%`), // Use Like operator for partial matching
      },
      relations: ['CNPJ_company'],
    });
    const formattedResponse = response.map((job) => {
      return {
        ...job,
        candidates: job.candidates
          ? JSON.parse(job.candidates)
          : job.candidates, // Parse JSON if candidates is a string
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
        CPF_collaborator: { CPF: cpf },
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
        { CNPJ_company: { CNPJ: cnpj }, CPF_collaborator: Not(IsNull()) },
      ],
      relations: ['CPF_collaborator'],
      order: {
        delete_at: 'DESC', // Para garantir que, entre os deletados, o mais recente seja priorizado
        update_at: 'DESC', // Caso queira priorizar o mais recente em termos de atualização, caso seja necessário
      },
    });

    if (response.length > 0) {
      let uniqueJobs = [] as any;
      const seenCpfs = new Set();
      uniqueJobs = response.filter((job) => {
        // Se o CPF já foi visto, verifica se o registro atual tem prioridade
        if (seenCpfs.has(job.CPF_collaborator.CPF)) {
          // Encontra o registro existente com o mesmo CPF
          const existingJob = response.find(
            (j) => j.CPF_collaborator.CPF === job.CPF_collaborator.CPF,
          );

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
          seenCpfs.add(job.CPF_collaborator.CPF);
          return true;
        }
      });

      if (uniqueJobs.length > 0 && uniqueJobs.length > 0) {
        await Promise.all(
          uniqueJobs.map(async (job) => {
            const CPF = job.CPF_collaborator.CPF;
            const collaborator = await this.collaboratorService.findOne(CPF);
            if (collaborator.status === 200) {
              collaboratorCompany.push({
                ...collaborator,
                job: job,
                isDeleted: job.delete_at ? true : false,
              });
            }
          }),
        );

        const uniqueCollaborators = collaboratorCompany.filter(
          (value, index, self) =>
            index ===
            self.findIndex(
              (t) => t.collaborator.CPF === value.collaborator.CPF,
            ),
        );

        return {
          status: 200,
          collaborator: uniqueCollaborators,
        };
      }

      return {
        status: 409,
        message: 'Registro não encontrado',
      };
    }

    return {
      status: 500,
      message: 'Erro ao buscar colaborador',
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
      relations: ['CNPJ_company'],
    });

    // Filtra todas as vagas onde o candidato está aplicado (independente do step)
    const jobsWithCpfAll = await Promise.all(
      openJobs
        .filter((job) => {
          const candidates = JSON.parse(job.candidates);
          return candidates.some(
            (candidate) => String(candidate.cpf) === String(CPF_collaborator),
          );
        })
        .map(async (job) => {
          const company = await this.companyService.findOne(
            job.CNPJ_company.CNPJ,
          );
          return {
            ...job,
            company: company.company,
          };
        }),
    );

    // Filtra as vagas onde o candidato possui step > 0
    const jobsWithCpfStepGreaterThanZero = jobsWithCpfAll.filter((job) => {
      let candidates = JSON.parse(job.candidates);
      // console.log('Candidatos da vaga antes do filtro:', candidates);

      // Filtra apenas o candidato com o CPF específico
      candidates = candidates.filter(
        (candidate) => String(candidate.cpf) === String(CPF_collaborator),
      );

      // Atualiza a lista de candidatos na vaga para conter apenas o candidato específico
      job.candidates = JSON.stringify(candidates);

      // console.log('Candidatos da vaga após filtro:', candidates);

      // Verifica se o candidato tem step > 0
      return candidates.some((candidate) => candidate.step > 0);
    });

    // console.log('jobsWithCpfStepGreaterThanZero', jobsWithCpfStepGreaterThanZero.length);
    // console.log('jobsWithCpfAll', jobsWithCpfAll.length);

    // Se existir ao menos uma vaga com step > 0, retorna apenas essas vagas
    if (jobsWithCpfStepGreaterThanZero.length > 0) {
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
    const response = await this.bucketService.findServices(
      id,
      typeService,
      year,
      month,
    );
    if (response && Array.isArray(response)) {
      // console.log("Response inicial:", response);
      // return;
      const enrichedResponse = await Promise.all(
        response.map(async (item) => {
          try {
            let service;
            if (typeService.toLowerCase() == 'absence') {
              const number = parseInt(item.fileName.split('_')[1]);
              service = await this.absenceService.findOne(number);
            } else {
              service = await this.serviceService.findOne(item.id);
            }
            // console.log("Serviço encontrado:", service);

            if (service?.status === 200) {
              const enrichedItem = {
                ...item,
                details:
                  typeService.toLowerCase() == 'absence'
                    ? service.absence
                    : service.service,
              };
              // console.log("enrichedItem", enrichedItem.length);
              return enrichedItem;
            }

            return item;
          } catch (error) {
            console.error(
              'Erro ao buscar detalhes do serviço para o item',
              item.id,
              error,
            );
            return item;
          }
        }),
      );

      // console.log("contagem", enrichedResponse.length);
      return enrichedResponse;
    }
  }

  async findAll() {
    try {
      let response = await this.jobRepository.find({
        where: { delete_at: IsNull(), CPF_collaborator: IsNull() },
        relations: ['CNPJ_company'],
      });
      const enrichedJobs = await Promise.all(
        response.map(async (job) => {
          const companyResponse = await this.companyService.findOne(
            job.CNPJ_company.CNPJ,
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
          CNPJ_company: { CNPJ: cnpj },
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
            candidates.map(async (candidate: any) => {
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
      let stepCounts = {} as any;
      const response = await this.jobRepository.find({
        where: {
          CPF_collaborator: Not(IsNull()),
          CNPJ_company: { CNPJ: cnpj },
          delete_at: IsNull(),
          motion_demission: Not(IsNull()),
        },
        relations: ['CPF_collaborator'],
      });

      let collaboratorsInProcess = await Promise.all(
        response.flatMap(async (job) => {
          if (job && job.demission) {
            try {
              job.demission = JSON.parse(job.demission); // Converte demission para JSON
              //@ts-ignore
              if (job.demission && job.demission.step == 'finish') {
                return null; // Remove o job se o step for igual a 4
              }
            } catch (error) {
              console.error('Erro ao fazer JSON.parse em demission:', error);
              job.demission = null; // Define como null em caso de erro
            }
          }

          if (job.CPF_collaborator) {
            delete job.CPF_collaborator.password;
            console.log();
            const picture = await this.collaboratorService.findFile(
              job.CPF_collaborator.CPF,
              'picture',
            );
            return {
              ...job,
              collaborator: job.CPF_collaborator,
              picture: picture,
            };
          }
        }),
      );

      collaboratorsInProcess = collaboratorsInProcess.filter(
        (collaborator) => collaborator !== null,
      );

      if (collaboratorsInProcess.length > 0) {
        stepCounts = collaboratorsInProcess.reduce(
          async (acc, collaborator) => {
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
              console.error(
                'Erro ao processar demission:',
                collaborator.demission,
                error,
              );
            }

            return acc;
          },
          {},
        );
      }

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

  async findOne(id: number) {
    try {
      let response = await this.jobRepository.findOne({
        where: { id: id },
        relations: ['user_create', 'CPF_collaborator'],
      });
      if (response) {
        if (response?.benefits) {
          response.benefits = JSON.parse(response.benefits);
        }
        if (response?.skills) {
          response.skills = JSON.parse(response.skills);
        }
        response.candidates = JSON.parse(response.candidates);
        if (response.candidates) {
          for (let index = 0; index < response.candidates.length; index++) {
            const candidate: any = response.candidates[index];
            const collaborator: any = await this.collaboratorService.findOne(
              candidate.cpf,
            );
            if (collaborator.status === 409) continue;
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
          userCreate: response.user_create,
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
    const {
      default: defaultJob,
      benefits,
      skills,
      localities,
      candidates,
      ...rest
    } = updateJobDto;

    const time = FindTimeSP();
    updateJobDto.update_at = time;
    const cleanedSalary = defaultJob?.salary.replace(/[^\d]/g, '');
    const cleanedCep = defaultJob?.cep.replace('-', '');
    const activeBenefits =
      benefits?.filter((b) => b.active).map((b) => b.name) || [];

    // Extrai só os nomes das skills
    const skillNames = skills?.map((s) => s.name) || [];
    const baseJob = {
      ...defaultJob,
      salary: cleanedSalary,
      cep: cleanedCep,
      candidates: candidates,
      benefits: JSON.stringify(activeBenefits),
      skills: JSON.stringify(skillNames),
      create_at: time,
      user_edit: updateJobDto.user_edit,
      CPF_collaborator: updateJobDto.CPF_collaborator,
      CNPJ_company: updateJobDto.CNPJ_company,
    };

    try {
      const response = await this.jobRepository.update(id, baseJob);
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

  async updateStatusCandidate(candidate: any, id: number) {
    const response = await this.jobRepository.findOne({ where: { id } });

    if (!response) {
      return {
        status: 500,
        message: 'Job not found',
      };
    }

    // Parse dos candidatos atuais salvos no banco
    let currentCandidates: any[] = [];
    try {
      currentCandidates = response.candidates
        ? JSON.parse(response.candidates)
        : [];
    } catch (e) {
      console.error('Erro ao fazer parse dos candidatos:', e);
      currentCandidates = [];
    }

    // Parse dos candidatos recebidos no body
    let updatedCandidates: any[] = [];
    try {
      updatedCandidates = JSON.parse(candidate.candidates);
    } catch (e) {
      console.error('Erro ao fazer parse dos candidatos recebidos:', e);
      updatedCandidates = [];
    }

    // Atualizar candidatos existentes
    const mergedCandidates = currentCandidates.map((existing) => {
      const update = updatedCandidates.find((u) => u.cpf === existing.cpf);
      if (update) {
        return {
          ...existing,
          ...update,
        };
      }
      return existing;
    });

    // Salva os candidatos atualizados no job
    response.candidates = JSON.stringify(mergedCandidates);
    await this.jobRepository.save(response);

    return {
      status: 200,
      message: 'Candidatos atualizados com sucesso',
      candidates: mergedCandidates,
    };
  }

  async applyJob(id: number, cpf: string) {
    console.log('applyJob', id, cpf);
    const response = await this.jobRepository.findOne({ where: { id } });

    if (!response) {
      return {
        status: 404,
        message: 'Job not found',
      };
    }

    // ✅ Tratamento seguro do JSON
    let currentCandidates: any[] = [];
    try {
      currentCandidates = response.candidates
        ? JSON.parse(response.candidates)
        : [];
    } catch (e) {
      console.error('Erro ao fazer parse dos candidatos:', e);
      currentCandidates = [];
    }

    // ✅ Verificar duplicidade de CPF
    const cpfAlreadyExists = currentCandidates.some(
      (candidate) => candidate.cpf === cpf,
    );

    if (cpfAlreadyExists) {
      return {
        status: 400,
        message: 'CPF já está cadastrado como candidato nesta vaga.',
      };
    }

    const newCandidate = {
      cpf: cpf,
      step: 0,
      status: null,
      verify: null,
      observation: null,
    };

    const updatedCandidates = [...currentCandidates, newCandidate];
    const updatedJob = {
      candidates: JSON.stringify(updatedCandidates),
    };

    try {
      const updateResult = await this.jobRepository.update(id, updatedJob);

      if (updateResult.affected === 1) {
        return {
          status: 200,
          message: 'Candidato aplicado com sucesso!',
        };
      }

      return {
        status: 404,
        message: 'Não foi possível aplicar para a vaga.',
      };
    } catch (e) {
      console.error(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async unapplyJob(id: number, cpf: string) {
    const response = await this.jobRepository.findOne({ where: { id } });
    if (!response) {
      return {
        status: 404,
        message: 'Job not found',
      };
    }
    const currentCandidates = JSON.parse(response?.candidates);
    const updatedCandidates = currentCandidates.filter((candidate) => {
      const candidateCpf = String(candidate.cpf).replace(/\D/g, '');
      const collaboratorCpf = String(cpf).replace(/\D/g, '');
      return candidateCpf !== collaboratorCpf;
    });
    const updatedJob = {
      candidates: JSON.stringify(updatedCandidates),
    };
    try {
      const response = await this.jobRepository.update(id, updatedJob);
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Job unapplied successfully!',
        };
      }
      return {
        status: 404,
        message: 'Could not unapply the job, something went wrong!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Internal error.',
      };
    }

    console.log(updatedCandidates);
  }

  async removeDocumentDynamic(id: number, name: string, where?: string) {
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
