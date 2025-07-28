import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import * as admin from 'firebase-admin';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    FirebaseService,
    {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: configService.get<string>('FIREBASE_project_id'),
              clientEmail: configService.get<string>('FIREBASE_client_email'),
              privateKey: configService
                .get<string>('FIREBASE_private_key')
                ?.replace(/\\n/g, '\n'),
            }),
          });
        }
        return admin;
      },
    },
  ],
  exports: [FirebaseService, 'FIREBASE_ADMIN'],
})
export class FirebaseModule {}
