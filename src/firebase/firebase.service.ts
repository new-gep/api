import { Inject, Injectable } from '@nestjs/common';
import { CreateFirebaseDto } from './dto/create-firebase.dto';
import { UpdateFirebaseDto } from './dto/update-firebase.dto';
import { NotificationService } from 'src/notification/notification.service';
import * as admin from 'firebase-admin';
import FindTimeSP from 'hooks/time';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN') 
    private readonly firebase: typeof admin,
    readonly notificationService: NotificationService,
  ) {}

  async sendNotification(
    cpf  :string,
    token: string,
    title: string,
    status:string,
    body : string,
    image?: string,
  ) {
    try {
      const message = {
        notification: {
          title,
          body,
          image: image
            ? image
            : 'https://newgep.com.br/images/logo/logo-light.svg',
        },
        token,
      };
      await this.firebase.messaging().send(message);
      const params = {
        CPF_collaborator:cpf,
        title : title,
        body  : body,
        status: status,
        image : image ? image : null,
        create_at: FindTimeSP()
      }

      return await this.notificationService.create(params)

    } catch (e) {
      console.error('Erro ao enviar notificação:', e);
    }
  }
}
