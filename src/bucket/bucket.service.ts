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

  async UploadCollaborator(file: Express.Multer.File, name: string, side: string, cpf: string) {
    console.log(name, side);
    let path: string;
    console.log(file)
    switch (name.toLowerCase()) {
      case 'rg':
        path = `collaborator/${cpf}/RG/${side}`;
        break;
      case 'address':
        path = `collaborator/${cpf}/Address`;
        break;
      case 'work_card':
        path = `collaborator/${cpf}/Work_Card/${side}`;
        break;
      case 'school_history':
        path = `collaborator/${cpf}/School_History/${side}`;
        break;
      case 'marriage_certificate':
        path = `collaborator/${cpf}/Marriage_Certificate`;
        break;
      case 'birth_certificate':
        path = `collaborator/${cpf}/Birth_Certificate/${side}`;
        break;
      case 'military_certificate':
        path = `collaborator/${cpf}/Military_Certificate`;
        break;
      case 'cnh':
        path = `collaborator/${cpf}/CNH/${side}`;
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    };
  
    const collaboratorFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
  
    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(collaboratorFile).promise();
      
      return {
        status: 200,
        message: 'Upload realizado com sucesso',
        location: s3Response.Location, // Retorna a URL do arquivo no bucket
      };
  
    } catch (error) {
      
      return {
        status: 500,
        message: 'Erro no upload do arquivo',
        error: error.message,
      };
    }
  }
  
  
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
    const missingDocumentsChildren = [];
  
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
  
      if (collaborator.children == 0) {
        // Se for a string "0", não há filhos, então não exigimos nenhum documento
      } else if (typeof collaborator.children === 'object' && !Array.isArray(collaborator.children)) {
        // Se for um objeto, percorremos os filhos e verificamos os documentos
        for (const childKey in collaborator.children) {
          if (collaborator.children.hasOwnProperty(childKey)) {
            const child = collaborator.children[childKey];
            const childName = child.name;
    
            // Lista de documentos a serem verificados para cada filho
            const childrenDocuments = [`Birth_Certificate`];
    
            // Verifica se o documento está presente
            for (const document of childrenDocuments) {
              const documentPath = `Children/${childName}/Birth_Certificate`;
    
              if (!await this.isDocumentPresent(collaborator.CPF, documentPath)) {
                if (!missingDocuments.includes(document)) {
                  missingDocuments.push(document); // Adiciona o documento uma única vez
                }
                // Adiciona o nome do filho que deve doc
                missingDocumentsChildren.push(childName);
              }
            }
          }
        }
      } else {
        // Se `children` for null, não exigimos nada, já que o campo não foi preenchido
      }
    
  
    // Verifica se deve exigir documento de casamento (apenas uma foto e certidão de casamento)
    if (collaborator.marriage) {
      if(collaborator.marriage != '0'){
        const marriageDocuments = [
          'Marriage_Certificate',
        ];
        for (const document of marriageDocuments) {
          if (!await this.isDocumentPresent(collaborator.CPF, document)) {
            missingDocuments.push(document);
          }
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
      missingDocumentsChildren:missingDocumentsChildren.length > 0 ? missingDocumentsChildren : null
    };
  };

}
