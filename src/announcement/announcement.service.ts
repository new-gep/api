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
          CPF: Not(cpf),
        },
        delete_at: IsNull(),
      },
      relations: ['CPF_Creator'],
    });

    const enrichedAnnouncements = await Promise.all(
      response.map(async (announcement) => {
        const gallery = await this.bucketService.findAnnouncement(
          announcement.id,
        );
        const picture = await this.bucketService.findCollaborator(
          announcement.CPF_Creator.CPF,
          'picture',
        );

        let parsedCandidates: any[] = [];
        try {
          parsedCandidates = announcement.candidates
            ? JSON.parse(announcement.candidates)
            : [];
        } catch (e) {
          console.error('Erro ao fazer parse de candidates:', e);
          parsedCandidates = [];
        }

        const alreadyApplied = parsedCandidates.some((candidate) => {
          const candidateCpf = String(candidate?.cpf).replace(/\D/g, '');
          const userCpf = String(cpf).replace(/\D/g, '');
          return candidateCpf === userCpf;
        });

        return {
          typeService: 'flex',
          ...announcement,
          gallery,
          picture: picture,
          apply: alreadyApplied,
        };
      }),
    );

    if (response) {
      return {
        status: 200,
        message: 'success',
        announcements: enrichedAnnouncements,
      };
    } else {
      return {
        status: 500,
        message: 'erro ',
      };
    }
  }

  async findOne(cpf: any) {
  const response = await this.announcementRepository.find({
    where: {
      CPF_Creator: {
        CPF: cpf,
      },
      delete_at: IsNull(),
    },
    relations: ['CPF_Creator', 'CPF_Responder'],
  });

  const enrichedAnnouncements = await Promise.all(
    response.map(async (announcement) => {
      const gallery = await this.bucketService.findAnnouncement(announcement.id);
      const picture = await this.bucketService.findCollaborator(cpf, 'picture');

      let candidates = [];
      if (announcement.candidates) {
        try {
          const parsed = JSON.parse(announcement.candidates);
          candidates = await Promise.all(
            parsed.map(async (candidate: any) => {
              const collaborator = await this.collaboratorService.findOne(candidate.cpf);
              return {
                ...candidate,
                collaborator, // estrutura esperada no front
              };
            }),
          );
        } catch (e) {
          console.error('Erro ao parsear candidatos:', e);
        }
      }

      // ✅ Enriquecer CPF_Responder com mesma estrutura de candidate
      let enrichedResponder = null;
      if (announcement.CPF_Responder?.CPF) {
        const responderCPF = announcement.CPF_Responder.CPF;

        const [collaborator, picture, gallery] = await Promise.all([
          this.collaboratorService.findOne(responderCPF),
          this.bucketService.findCollaborator(responderCPF, 'picture'),
          this.bucketService.findCollaborator(responderCPF, 'Gallery'),
        ]);

        enrichedResponder = {
          ...announcement.CPF_Responder,
          collaborator: {
            ...collaborator,
            picture,
            gallery,
          },
        };
      }

      return {
        ...announcement,
        gallery,        // do anúncio
        picture,        // do criador
        candidates,     // candidatos com collaborator completo
        CPF_Responder: enrichedResponder || announcement.CPF_Responder,
      };
    }),
  );

  if (response) {
    return {
      status: 200,
      message: 'success',
      announcements: enrichedAnnouncements,
    };
  } else {
    return {
      status: 500,
      message: 'erro',
    };
  }
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
      verify: null,
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
