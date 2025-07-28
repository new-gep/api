import { Inject, Injectable } from '@nestjs/common';
import { CreateFirebaseDto } from './dto/create-firebase.dto';
import { UpdateFirebaseDto } from './dto/update-firebase.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(@Inject('FIREBASE_ADMIN') private readonly firebase: typeof admin) {}

  async sendNotification(
    token: string,
    title: string,
    body: string,
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
      
    } catch (e) {
      console.error('Erro ao enviar notificação:', e);
    }
  }
}
