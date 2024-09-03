import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class BucketService {
  private readonly spacesEndpoint: AWS.Endpoint;
  private readonly bucket: AWS.S3;
  private readonly bucketName: string;

  constructor() {
    this.spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
    this.bucketName = process.env.BUCKET_NAME;
    this.bucket = new AWS.S3({
      endpoint       : this.spacesEndpoint,
      accessKeyId    : process.env.BUCKET_ACCESS_KEY,
      secretAccessKey: process.env.BUCKET_SECRET_KEY,
    });
  };

  UploadCollaborator(file: Express.Multer.File) {
    return 'This action adds a new company';
  };

  // Método para verificar se um documento está presente no bucket
  async isDocumentPresent(CPF: string, path: string): Promise<boolean> {
    const params = {
      Bucket: this.bucketName,
      Key: `collaborator/${CPF}/${path}`,
    };

    try {
      await this.bucket.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  };

  async checkCollaboratorBucketDocuments(collaborator) {
    const missingDocuments = [];
  
    // Verifica a presença do documento de RG (se o PDF estiver presente, dispensa as imagens)
    const rgPdfExists = await this.isDocumentPresent(collaborator.CPF, 'RG/RG.pdf');
    let rgDocumentMissing = false;
    if (!rgPdfExists) {
      const rgFrontExists = await this.isDocumentPresent(collaborator.CPF, 'RG/RG.Front');
      const rgBackExists = await this.isDocumentPresent(collaborator.CPF, 'RG/RG.Back');
      // Se nem o PDF, nem o Front, nem o Back existem, considera o RG como faltante
      if (!rgFrontExists || !rgBackExists) {
        rgDocumentMissing = true;
      }
    };
    if (rgDocumentMissing) {
      missingDocuments.push('RG');
    };
    // Verifica a presença do documento de Work Card (se o PDF estiver presente, dispensa as imagens)
    const workCardPdfExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/Work_Card.pdf');
    let workCardDocumentMissing = false;
    if (!workCardPdfExists) {
      const workCardFrontExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/Work_Card.Front');
      const workCardBackExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/Work_Card.Back');
      // Se nem o PDF, nem o Front, nem o Back existem, considera o Work Card como faltante
      if (!workCardFrontExists || !workCardBackExists) {
        workCardDocumentMissing = true;
      }
    };
    if (workCardDocumentMissing) {
      missingDocuments.push('Work_Card');
    };
  
    // Verifica os comprovantes de endereço
    const addressDocuments = [
      'Address',
      'Address.pdf',
    ];
  
    let documentFound = false;
  
    // Verifica se pelo menos um dos documentos existe
    for (const document of addressDocuments) {
      if (await this.isDocumentPresent(collaborator.CPF, document)) {
        documentFound = true;
        break; // Se encontrar um dos documentos, sai do loop
      }
    };
  
    // Se nenhum dos documentos foi encontrado, adiciona ao array de documentos faltantes
    if (!documentFound) {
      missingDocuments.push('Address');
    };
  
    // Verifica se deve exigir documentos de filhos (para cada filho, verifica uma foto e certidão de nascimento)
    if (collaborator.children && Array.isArray(collaborator.children)) {
      for (const child of collaborator.children) {
        const childName = child.name;
        const childrenDocuments = [
          `Children.${childName}.Picture`,
          `Children.${childName}.BirthCertificate`,
        ];
  
        for (const document of childrenDocuments) {
          if (!await this.isDocumentPresent(collaborator.CPF, document)) {
            missingDocuments.push(document);
          }
        }
      }
    };
  
    // Verifica se deve exigir documento de casamento (apenas uma foto e certidão de casamento)
    if (collaborator.marriage) {
      const marriageDocuments = [
        'Marriage_Certificate',
      ];
  
      for (const document of marriageDocuments) {
        if (!await this.isDocumentPresent(collaborator.CPF, document)) {
          missingDocuments.push(document);
        }
      }
    };
  
    // Verifica se a foto do colaborador está presente
    if (!await this.isDocumentPresent(collaborator.CPF, 'Picture')) {
      missingDocuments.push('Picture');
    };
  
    // Verifica se o Certificate School está presente
    if (!await this.isDocumentPresent(collaborator.CPF, 'School_History')) {
      missingDocuments.push('School_History');
    };
  
    return {
      status: 200,
      missingDocuments: missingDocuments.length > 0 ? missingDocuments : null,
    };
  };
  

}
