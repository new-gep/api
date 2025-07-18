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

  async update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    const time = findTimeSP();
    updateAnnouncementDto.update_at = time;
    console.log(updateAnnouncementDto);
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
    const response = await this.announcementRepository.find({
      where: {
        CPF_Creator: { CPF: cpfCreator },
        CPF_Responder: { CPF: IsNull() },
        delete_at: IsNull(),
      },
      relations: ['CPF_Creator'],
    });

    const result = response.map((announcement: any) => {
      let alreadyCandidate = false;
      let hasPropostal = false;

      try {
        const candidates = JSON.parse(announcement.candidates || '[]');

        alreadyCandidate = candidates.some(
          (candidate: any) => candidate.cpf === cpfResponder,
        );

        hasPropostal = candidates.some(
          (candidate: any) => candidate.propostal === true,
        );
      } catch (err) {
        console.error('Erro ao fazer parse dos candidates:', err);
      }

      return {
        ...announcement,
        alreadyCandidate,
        propostal: hasPropostal,
      };
    });

    console.log(result);

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

    const userCpf = String(cpf).replace(/\D/g, '');

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
        return candidateCpf === userCpf && candidate?.propostal === true;
      });

      if (hasPropostal) {
        result.push({
          ...announcement,
          title: announcement.title || 'Título não informado',
          receivedPropostal: true,
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

    console.log(updatedCandidates);
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
