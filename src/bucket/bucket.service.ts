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


  private async getFileFromBucket(key: string): Promise<{ ContentType: string, base64Data: string } | null> {
    try {
      const fileData = await this.bucket.getObject({ Bucket: this.bucketName, Key: key }).promise();
      const base64Data = fileData.Body.toString('base64');
      return {
        ContentType: fileData.ContentType, // Retorna o tipo do arquivo
        base64Data: `data:${fileData.ContentType};base64,${base64Data}` // Retorna o arquivo em base64
      };
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null; // Retorna null se o arquivo não existir
      }
      throw new Error(`Erro ao buscar o arquivo do bucket: ${error.message}`);
    }
  };

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

  async UploadCollaborator(file: Express.Multer.File, name: string, side: string, cpf: string) {
    let path: string;

    if (name.toLowerCase().includes('birth_certificate')) {
      path = `collaborator/${cpf}/Birth_Certificate/${side}`;
    } else {
      switch (name.toLowerCase()) {
        case 'picture':
          path = `collaborator/${cpf}/Picture`;
          break;
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
          path = `collaborator/${cpf}/School_History`;
          break;
        case 'military_certificate':
          path = `collaborator/${cpf}/Military_Certificate`;
          break;
        case 'marriage_certificate':
          path = `collaborator/${cpf}/Marriage_Certificate`;
          break;
        case 'cnh':
          path = `collaborator/${cpf}/CNH/${side}`;
          break;
        default:
          return {
            status: 400,
            message: `Tipo de documento não suportado: ${name}`,
          };
      }
    }
    

    const mimeType = file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype
  
    const collaboratorFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: mimeType,
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
  };
  
  async findCollaborator(cpf: string, name: string) {
    try {
      if(name.toLowerCase().includes('birth_certificate')){
        const birthKey = `collaborator/${cpf}/Birth_Certificate/${name}`;
        const birthFile = await this.getFileFromBucket(birthKey);
            
            if(birthFile?.ContentType === 'application/pdf'){
              return {
                status: 200,
                type: 'pdf',
                path: birthFile.base64Data,
              };
            }
  
            return {
              status: 200,
              type: 'picture',
              path: birthFile.base64Data,
            };
      }else{
        switch (name.toLowerCase()) {
          case 'rg':
            const rgPdfKey   = `collaborator/${cpf}/RG/complet`;  // Caso seja um PDF completo
            const rgFrontKey = `collaborator/${cpf}/RG/front`;      // Caso tenha "front"
            const rgBackKey  = `collaborator/${cpf}/RG/back`;        // Caso tenha "back"
    
            // Tentar buscar o PDF completo primeiro
            const pdfFile = await this.getFileFromBucket(rgPdfKey);
            if (pdfFile?.ContentType === 'application/pdf') {
              return {
                status: 200,
                type: 'pdf',
                path: pdfFile.base64Data // Retorna o PDF completo em base64
              };
            }
    
            // Se o PDF não existir, tentar buscar as imagens front e back
            const frontFile = await this.getFileFromBucket(rgFrontKey);
            const backFile  = await this.getFileFromBucket(rgBackKey);
    
            // Retorna as imagens em base64
            return {
              status: 200,
              type: 'picture',
              path: [frontFile.base64Data, backFile.base64Data], // Retorna front e back como um array
            };
    
          case 'address':
            const addressKey = `collaborator/${cpf}/Address`;
            const addressFile = await this.getFileFromBucket(addressKey);
            
            if(addressFile?.ContentType === 'application/pdf'){
              return {
                status: 200,
                type: 'pdf',
                path: addressFile.base64Data,
              };
            }
  
            return {
              status: 200,
              type: 'picture',
              path: addressFile.base64Data,
            };
    
          case 'work_card':
            const workCardPdfKey   = `collaborator/${cpf}/Work_Card/complet`;
            const workCardFrontKey = `collaborator/${cpf}/Work_Card/front`;
            const workCardBackKey  = `collaborator/${cpf}/Work_Card/back`;
    
            // Buscar PDF completo do Work Card
            const workCardPdf = await this.getFileFromBucket(workCardPdfKey);
            if (workCardPdf?.ContentType === 'application/pdf') {
              return {
                status: 200,
                type: 'pdf',
                path: workCardPdf.base64Data,
              };
            }
    
            // Caso não tenha PDF, busca imagens front/back
            const workCardFront = await this.getFileFromBucket(workCardFrontKey);
            const workCardBack  = await this.getFileFromBucket(workCardBackKey);
    
            return {
              status: 200,
              type: 'picture',
              path: [workCardFront.base64Data, workCardBack.base64Data],
            };
    
          case 'school_history':
            const schoolHistoryKey = `collaborator/${cpf}/School_History`;
            const schoolHistoryFile = await this.getFileFromBucket(schoolHistoryKey);
    
            if(schoolHistoryFile?.ContentType === 'application/pdf'){
              return {
                status: 200,
                type: 'pdf',
                path: schoolHistoryFile.base64Data,
              };
            }
  
            return {
              status: 200,
              type: 'picture',
              path: schoolHistoryFile.base64Data, // conteúdo base64 do PDF
            };
    
          case 'cnh':
            const cnhPdfKey = `collaborator/${cpf}/CNH/complet`;  // Caso seja um PDF completo
            const cnhFrontKey = `collaborator/${cpf}/CNH/front`;      // Caso tenha "front"
            const cnhBackKey = `collaborator/${cpf}/CNH/back`;        // Caso tenha "back"
      
            // Tentar buscar o PDF completo primeiro
            const cnhFile = await this.getFileFromBucket(cnhPdfKey);
            if (cnhFile?.ContentType === 'application/pdf') {
                return {
                  status: 200,
                  type: 'pdf',
                  path: cnhFile.base64Data // Retorna o PDF completo em base64
                };
            }
      
            // Se o PDF não existir, tentar buscar as imagens front e back
            const CNHfrontFile = await this.getFileFromBucket(cnhFrontKey);
            const CNHbackFile = await this.getFileFromBucket(cnhBackKey);
      
            // Retorna as imagens em base64
            return {
              status: 200,
              type: 'picture',
              path: [CNHfrontFile.base64Data, CNHbackFile.base64Data], // Retorna front e back como um array
            };
          
          case 'military_certificate':
              
            const militaryKey = `collaborator/${cpf}/Military_Certificate`;
            const militaryFile = await this.getFileFromBucket(militaryKey);
            
            if (militaryFile?.ContentType === 'application/pdf' ) {
              return {
                status: 200,
                type: 'pdf',
                path: militaryFile.base64Data // Retorna o PDF completo em base64
              };
            }
  
            return {
              status: 200,
              type: 'picture',
              path: militaryFile.base64Data, // arquivo base64 de endereço
            };
          
          case 'marriage_certificate':
            const marriageKey = `collaborator/${cpf}/Marriage_Certificate`;
            const marriageFile = await this.getFileFromBucket(marriageKey);
  
            if (marriageFile?.ContentType === 'application/pdf' ) {
              return {
                status: 200,
                type: 'pdf',
                path: marriageFile.base64Data // Retorna o PDF completo em base64
              };
            };
    
            return {
              status: 200,
              type: 'picture',
              path: marriageFile.base64Data, // arquivo base64 de endereço
            };
          
          case 'children_certificate':
            console.log('childrens')
            break
          
          case 'picture':
            const pictureKey = `collaborator/${cpf}/Picture`;
            const pictureFile = await this.getFileFromBucket(pictureKey);
    
            return {
              status: 200,
              type: 'picture',
              path: pictureFile.base64Data, // arquivo base64 de endereço
            };   
    
          default:
            return {
              status: 400,
              message: `Tipo de documento não suportado: ${name}`,
            };
        }
      }
    } catch (error) {
      return {
        status: 500,
        message: 'Erro ao buscar o documento',
        error: error.message,
      };
    }
  };

  async checkCollaboratorBucketDocuments(collaborator:any) {
    const missingDocuments = [];
    const missingDocumentsChildren = [];
  
    // Verifica a presença do documento de RG (se o PDF estiver presente, dispensa as imagens)
    const rgPdfExists = await this.isDocumentPresent(collaborator.CPF, 'RG/complet');
    let rgDocumentMissing = false;
    if (!rgPdfExists) {
      const rgFrontExists = await this.isDocumentPresent(collaborator.CPF, 'RG/front');
      const rgBackExists = await this.isDocumentPresent(collaborator.CPF, 'RG/back');
      // Se nem o PDF, nem o Front, nem o Back existem, considera o RG como faltante
      if (!rgFrontExists || !rgBackExists) {
        rgDocumentMissing = true;
      }
    };
    if (rgDocumentMissing) {
      missingDocuments.push('RG');
    };
    // Verifica a presença do documento de Work Card (se o PDF estiver presente, dispensa as imagens)
    const workCardPdfExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/complet');
    let workCardDocumentMissing = false;
    if (!workCardPdfExists) {
      const workCardFrontExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/front');
      const workCardBackExists = await this.isDocumentPresent(collaborator.CPF, 'Work_Card/back');
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

    if (collaborator.sex) {
      if(collaborator.sex == 'M'){
        const militaryDocuments = [
          'Military_Certificate',
        ];
        for (const document of militaryDocuments) {
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
