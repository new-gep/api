import { Inject, Injectable } from '@nestjs/common';
import { CreateFirebaseDto } from './dto/create-firebase.dto';
import { UpdateFirebaseDto } from './dto/update-firebase.dto';
import { NotificationService } from 'src/notification/notification.service';
import * as admin from 'firebase-admin';
import FindTimeSP from 'hooks/time';
import axios from 'axios';

@Injectable()
export class FirebaseService {
  private readonly apiKey: string;
  configService: any;
  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebase: typeof admin,
    readonly notificationService: NotificationService,
  ) {}

  async sendNotification(
    cpf: string,
    token: string,
    title: string,
    status: string,
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
      const params = {
        CPF_collaborator: cpf,
        title: title,
        body: body,
        status: status,
        image: image ? image : null,
        create_at: FindTimeSP(),
      };

      return await this.notificationService.create(params);
    } catch (e) {
      console.error('Erro ao enviar notificação:', e);
    }
  }

  async getDistanceFromCepToCep(
    cepA: string,
    cepB: string,
  ): Promise<{
    distance: string;
    drivingTime: string;
    transitTime: string;
  } | null> {
    const getCoordinates = async (cep: string) => {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${cep}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const geoRes = await axios.get(geoUrl);
      const location = geoRes.data?.results?.[0]?.geometry?.location;
      if (!location)
        throw new Error(`Não foi possível geocodificar o CEP: ${cep}`);
      return `${location.lat},${location.lng}`;
    };

    try {
      const origin = await getCoordinates(cepA);
      const destination = await getCoordinates(cepB);

      const distUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const distRes = await axios.get(distUrl);

      const drivingElement = distRes.data?.rows?.[0]?.elements?.[0];
      if (
        !drivingElement ||
        drivingElement.status === 'NOT_FOUND' ||
        drivingElement.status === 'ZERO_RESULTS'
      ) {
        return null;
      }

      return {
        distance: drivingElement.distance.text,
        drivingTime: drivingElement.duration.text,
        transitTime: '', // ou preencha se quiser
      };
    } catch (error) {
      // Retorna null em caso de erro
      return null;
    }
  }
}
