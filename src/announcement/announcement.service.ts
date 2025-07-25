import { Inject, Injectable } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { UploadAnnouncementDto } from './dto/upload-announcement.dto';
import { Announcement } from './entities/announcement.entity';
import { BucketService } from 'src/bucket/bucket.service';
import { IsNull, Not, Repository } from 'typeorm';
import findTimeSP from 'hooks/time';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
@Injectable()
export class AnnouncementService {
  constructor(
    @Inject('ANNOUNCEMENT_REPOSITORY')
    private announcementRepository: Repository<Announcement>,
    private readonly collaboratorService: CollaboratorService,
    private readonly bucketService: BucketService,
  ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    const time = findTimeSP();
    createAnnouncementDto.create_at = time;
    const response = await this.announcementRepository.save(
      createAnnouncementDto,
    );

    if (response) {
      return {
        status: 201,
        message: 'Anúncio criado.',
        announcement: response,
      };
    } else {
      return {
        status: 500,
        message: 'Algo deu errado, tente mais tarde.',
      };
    }
  }

  async uploadFile(
    uploadAnnouncementDto: UploadAnnouncementDto,
    file: Express.Multer.File,
  ) {
    return await this.bucketService.uploadAnnouncement(
      file,
      uploadAnnouncementDto.id,
    );
  }

  async updateUploadFile(
    uploadAnnouncementDto: UploadAnnouncementDto,
    file: Express.Multer.File,
  ) {
    return await this.bucketService.updateUploadAnnouncement(
      file,
      uploadAnnouncementDto.id,
    );
  }

  async findAll(cpf: any) {
    const response = await this.announcementRepository.find({
      where: {
        CPF_Creator: {
          CPF: Not(cpf),
        },
        CPF_Responder: {
          CPF: IsNull(),
        },
        delete_at: IsNull(),
      },
      relations: ['CPF_Creator'],
    });

    const enrichedAnnouncements = await Promise.all(
      response.map(async (announcement) => {
        let parsedCandidates: any[] = [];
        try {
          parsedCandidates = announcement.candidates
            ? JSON.parse(announcement.candidates)
            : [];
        } catch (e) {
          console.error('Erro ao fazer parse de candidates:', e);
          parsedCandidates = [];
        }

        const userCpf = String(cpf).replace(/\D/g, '');

        // Verifica se já foi enviada proposta
        const hasPropostal = parsedCandidates.some((candidate) => {
          const candidateCpf = String(candidate?.cpf).replace(/\D/g, '');
          return candidateCpf === userCpf && candidate?.propostal === true;
        });

        // Se já recebeu proposta, ignora esse anúncio
        if (hasPropostal) return null;

        const gallery = await this.bucketService.findAnnouncement(
          announcement.id,
        );

        const picture = await this.bucketService.findCollaborator(
          announcement.CPF_Creator.CPF,
          'picture',
        );

        const creatorGallery = await this.bucketService.findCollaborator(
          announcement.CPF_Creator.CPF,
          'Gallery',
        );

        const alreadyApplied = parsedCandidates.some((candidate) => {
          const candidateCpf = String(candidate?.cpf).replace(/\D/g, '');
          return candidateCpf === userCpf;
        });

        return {
          typeService: 'flex',
          ...announcement,
          gallery,
          picture,
          apply: alreadyApplied,
          CPF_Creator: {
            collaborator: {
              collaborator: announcement.CPF_Creator,
              picture: picture?.path || null,
              gallery: creatorGallery || {},
            },
          },
        };
      }),
    );

    // Remove os retornos nulos (anúncios que tinham proposta)
    const filtered = enrichedAnnouncements.filter(Boolean);

    return {
      status: 200,
      message: 'success',
      announcements: filtered,
    };
  }

  async findOne(cpf: any) {
    const [created, responded] = await Promise.all([
      this.announcementRepository.find({
        where: {
          CPF_Creator: {
            CPF: cpf,
          },
          delete_at: IsNull(),
        },
        relations: ['CPF_Creator', 'CPF_Responder'],
      }),
      this.announcementRepository.find({
        where: {
          CPF_Responder: {
            CPF: cpf,
          },
          delete_at: IsNull(),
        },
        relations: ['CPF_Creator', 'CPF_Responder'],
      }),
    ]);

    const processAnnouncements = async (
      announcements: any[],
      creatorType: 'my' | 'other',
    ) => {
      return Promise.all(
        announcements.map(async (announcement) => {
          const gallery = await this.bucketService.findAnnouncement(
            announcement.id,
          );

          let candidates = [];
          if (announcement.candidates) {
            try {
              const parsed = JSON.parse(announcement.candidates);
              const filteredCandidates = parsed.filter(
                (c: any) => !c.propostal,
              );
              candidates = await Promise.all(
                filteredCandidates.map(async (candidate: any) => {
                  const collaborator = await this.collaboratorService.findOne(
                    candidate.cpf,
                  );
                  return {
                    ...candidate,
                    collaborator,
                  };
                }),
              );
            } catch (e) {
              console.error('Erro ao parsear candidatos:', e);
            }
          }

          let enrichedResponder = null;
          if (announcement.CPF_Responder?.CPF) {
            const responderCPF = announcement.CPF_Responder.CPF;

            const [responder, responderPicture, responderGallery] =
              await Promise.all([
                this.collaboratorService.findOne(responderCPF),
                this.bucketService.findCollaborator(responderCPF, 'picture'),
                this.bucketService.findCollaborator(responderCPF, 'Gallery'),
              ]);

            enrichedResponder = {
              collaborator: {
                ...responder,
                picture: responderPicture?.path,
                gallery: responderGallery,
              },
            };
          }

          let enrichedCreator = null;
          if (announcement.CPF_Creator?.CPF) {
            const creatorCPF = announcement.CPF_Creator.CPF;

            const [creator, creatorPicture, creatorGallery] = await Promise.all(
              [
                this.collaboratorService.findOne(creatorCPF),
                this.bucketService.findCollaborator(creatorCPF, 'picture'),
                this.bucketService.findCollaborator(creatorCPF, 'Gallery'),
              ],
            );

            enrichedCreator = {
              collaborator: {
                ...creator,
                picture: creatorPicture?.path,
                gallery: creatorGallery,
              },
            };
          }

          return {
            creator: creatorType,
            ...announcement,
            gallery,
            CPF_Creator: enrichedCreator || announcement.CPF_Creator,
            CPF_Responder: enrichedResponder || announcement.CPF_Responder,
            candidates,
          };
        }),
      );
    };

    const enrichedCreated = await processAnnouncements(created, 'my');
    const enrichedResponded = await processAnnouncements(responded, 'other');

    const all = [...enrichedCreated, ...enrichedResponded];

    return {
      status: 200,
      message: 'success',
      announcements: all,
    };
  }

  async findOneById(id: number) {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['CPF_Creator', 'CPF_Responder'],
    });

    if (!announcement) {
      return {
        status: 404,
        message: 'announcement not found',
        announcement: null,
      };
    }

    const gallery = await this.bucketService.findAnnouncement(announcement.id);

    // Enriquecer candidatos
    let candidates = [];
    if (announcement.candidates) {
      try {
        const parsed = JSON.parse(announcement.candidates);
        const filteredCandidates = parsed.filter((c: any) => !c.propostal);

        candidates = await Promise.all(
          filteredCandidates.map(async (candidate: any) => {
            const collaborator = await this.collaboratorService.findOne(
              candidate.cpf,
            );
            return {
              ...candidate,
              collaborator,
            };
          }),
        );
      } catch (e) {
        console.error('Erro ao parsear candidatos:', e);
      }
    }

    // Enriquecer responder
    let enrichedResponder = null;
    if (announcement.CPF_Responder?.CPF) {
      const responderCPF = announcement.CPF_Responder.CPF;

      const [responder, responderPicture, responderGallery] = await Promise.all(
        [
          this.collaboratorService.findOne(responderCPF),
          this.bucketService.findCollaborator(responderCPF, 'picture'),
          this.bucketService.findCollaborator(responderCPF, 'Gallery'),
        ],
      );

      enrichedResponder = {
        collaborator: {
          ...responder,
          picture: responderPicture?.path,
          gallery: responderGallery,
        },
      };
    }

    // Enriquecer creator
    let enrichedCreator = null;
    if (announcement.CPF_Creator?.CPF) {
      const creatorCPF = announcement.CPF_Creator.CPF;

      const [creator, creatorPicture, creatorGallery] = await Promise.all([
        this.collaboratorService.findOne(creatorCPF),
        this.bucketService.findCollaborator(creatorCPF, 'picture'),
        this.bucketService.findCollaborator(creatorCPF, 'Gallery'),
      ]);

      enrichedCreator = {
        collaborator: {
          ...creator,
          picture: creatorPicture?.path,
          gallery: creatorGallery,
        },
      };
    }

    return {
      status: 200,
      message: 'success',
      announcement: {
        ...announcement,
        gallery,
        CPF_Creator: enrichedCreator || announcement.CPF_Creator,
        CPF_Responder: enrichedResponder || announcement.CPF_Responder,
        candidates,
      },
    };
  }

  async findHistory(cpf: string) {
    const response = await this.announcementRepository.find({
      where: [
        {
          CPF_Creator: { CPF: cpf },
          CPF_Responder: Not(IsNull()),
          delete_at: Not(IsNull()),
        },
        {
          CPF_Responder: { CPF: cpf },
          CPF_Creator: Not(IsNull()),
          delete_at: Not(IsNull()),
        },
      ],
      relations: ['CPF_Creator', 'CPF_Responder'],
    });

    const enriched = await Promise.all(
      response.map(async (announcement) => {
        const creatorCPF = announcement.CPF_Creator?.CPF;
        const responderCPF = announcement.CPF_Responder?.CPF;

        const creatorPicture = await this.bucketService.findCollaborator(
          creatorCPF,
          'picture',
        );

        const creatorGallery = await this.bucketService.findCollaborator(
          creatorCPF,
          'Gallery',
        );

        const responderPicture = await this.bucketService.findCollaborator(
          responderCPF,
          'picture',
        );

        const responderGallery = await this.bucketService.findCollaborator(
          responderCPF,
          'Gallery',
        );

        return {
          ...announcement,
          typeService: 'flex',
          createdByUser: creatorCPF === cpf,
          respondedByUser: responderCPF === cpf,
          CPF_Creator: {
            collaborator: {
              collaborator: announcement.CPF_Creator,
              picture: creatorPicture?.path || null,
              gallery: creatorGallery || {},
            },
          },
          CPF_Responder: {
            collaborator: {
              collaborator: announcement.CPF_Responder,
              picture: responderPicture?.path || null,
              gallery: responderGallery || {},
            },
          },
        };
      }),
    );

    return {
      status: 200,
      message: 'success',
      history: enriched,
    };
  }

  async update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    const time = findTimeSP();
    updateAnnouncementDto.update_at = time;
    try {
      const response = await this.announcementRepository.update(
        id,
        updateAnnouncementDto,
      );
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Anuncio atualizado com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possível atualizar o Anuncio, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async findPropostal(cpfResponder: string, cpfCreator: string) {
    const query = `
      SELECT 
        a.*,
        CASE 
          WHEN jt.propostal = 'true' THEN TRUE 
          ELSE FALSE 
        END AS propostal,
        CASE 
          WHEN jt.propostal = 'false' THEN TRUE 
          ELSE FALSE 
        END AS alreadyCandidate
      FROM announcement a
      LEFT JOIN JSON_TABLE(
        a.candidates,
        '$[*]' COLUMNS (
          cpf VARCHAR(20) PATH '$.cpf',
          propostal VARCHAR(10) PATH '$.propostal'
        )
      ) AS jt ON jt.cpf = ?
      WHERE 
        a.CPF_creator = ?
        AND a.CPF_responder IS NULL
        AND a.delete_at IS NULL;
    `;

    
    const result = await this.announcementRepository.query(query, [
      cpfResponder, // corresponde ao jt.cpf = ?
      cpfCreator,   // corresponde ao a.CPF_creator = ?
    ]);

    // if (!result || result.length === 0) {
    //   return {
    //     status: 404,
    //     message: 'Nenhuma proposta encontrada para esse candidato.',
    //   };
    // }

    return {
      status: 200,
      propostal: result,
    };
  }

  async findAllPropostalsByCPF(cpf: string) {
    const response = await this.announcementRepository.find({
      where: {
        delete_at: IsNull(),
        CPF_Responder: { CPF: IsNull() }, // ✅ Apenas vagas em aberto
      },
      relations: ['CPF_Creator'],
    });

    const result = [];

    for (const announcement of response) {
      let parsedCandidates: any[] = [];
      try {
        parsedCandidates = announcement.candidates
          ? JSON.parse(announcement.candidates)
          : [];
      } catch (e) {
        console.error('Erro ao fazer parse de candidates:', e);
        parsedCandidates = [];
      }

      const hasPropostal = parsedCandidates.some((candidate) => {
        const candidateCpf = String(candidate?.cpf).replace(/\D/g, '');
        const userCpf = String(cpf).replace(/\D/g, '');
        return candidateCpf === userCpf && candidate?.propostal === true;
      });

      if (hasPropostal) {
        const gallery = await this.bucketService.findAnnouncement(
          announcement.id,
        );

        const picture = await this.bucketService.findCollaborator(
          announcement.CPF_Creator.CPF,
          'picture',
        );

        const creatorGallery = await this.bucketService.findCollaborator(
          announcement.CPF_Creator.CPF,
          'Gallery',
        );

        result.push({
          typeService: 'flex',
          ...announcement,
          gallery,
          picture: picture?.path || null,
          apply: true, // pois já recebeu proposta
          receivedPropostal: true,
          CPF_Creator: {
            collaborator: {
              collaborator: announcement.CPF_Creator,
              picture: picture?.path || null,
              gallery: creatorGallery || {},
            },
          },
        });
      }
    }

    return {
      status: 200,
      message: 'success',
      receivedPropostals: result,
    };
  }

  async applyPropostal(id: number, cpf: string) {
    const response = await this.announcementRepository.findOne({
      where: { id },
    });

    if (!response) {
      return {
        status: 404,
        message: 'announcement not found',
      };
    }

    // ✅ Tratamento seguro do JSON
    let currentCandidates: any[] = [];
    try {
      currentCandidates = response.candidates
        ? JSON.parse(response.candidates)
        : [];
    } catch (e) {
      console.error('Erro ao fazer parse dos announcement:', e);
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
      status: null,
      propostal: true,
    };

    const updatedCandidates = [...currentCandidates, newCandidate];
    const updatedJob = {
      candidates: JSON.stringify(updatedCandidates),
    };

    try {
      const updateResult = await this.announcementRepository.update(
        id,
        updatedJob,
      );

      if (updateResult.affected === 1) {
        return {
          status: 200,
          message: 'Proposta aplicada com sucesso!',
        };
      }

      return {
        status: 404,
        message: 'Não foi possível aplicar para a proposta.',
      };
    } catch (e) {
      console.error(e);
      return {
        status: 500,
        message: 'Erro interno.',
      };
    }
  }

  async applyJob(id: number, cpf: string) {
    const response = await this.announcementRepository.findOne({
      where: { id },
    });

    if (!response) {
      return {
        status: 404,
        message: 'announcement not found',
      };
    }

    // ✅ Tratamento seguro do JSON
    let currentCandidates: any[] = [];
    try {
      currentCandidates = response.candidates
        ? JSON.parse(response.candidates)
        : [];
    } catch (e) {
      console.error('Erro ao fazer parse dos announcement:', e);
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
      status: null,
      propostal: false,
    };

    const updatedCandidates = [...currentCandidates, newCandidate];
    const updatedJob = {
      candidates: JSON.stringify(updatedCandidates),
    };

    try {
      const updateResult = await this.announcementRepository.update(
        id,
        updatedJob,
      );

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
    const response = await this.announcementRepository.findOne({
      where: { id },
    });
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
      const response = await this.announcementRepository.update(id, updatedJob);
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
  }

  async removeFile(key: string) {
    const response = await this.bucketService.deleteFile(key);
    if (response) {
      return {
        status: 200,
        message: 'Deleted successfully',
      };
    }
    return {
      status: 500,
      message: 'error',
    };
  }

  async remove(id: number) {
    try {
      const time = findTimeSP();

      const propsDelete = {
        delete_at: time,
      };

      const response = await this.announcementRepository.update(
        id,
        propsDelete,
      );
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Anúncio deletado com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel deletar o anúncio, algo deu errado!',
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
