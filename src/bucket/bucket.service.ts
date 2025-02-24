import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import Mask from 'hooks/mask';
import Poppler from 'node-poppler';
import ConvertImageToBase64 from 'hooks/covertImageToBase64';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'os';

@Injectable()
export class BucketService {
  private readonly spacesEndpoint: AWS.Endpoint;
  private readonly bucket: AWS.S3;
  private readonly bucketName: string;

  constructor() {
    this.spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
    this.bucketName = process.env.BUCKET_NAME;
    this.bucket = new AWS.S3({
      endpoint: this.spacesEndpoint,
      accessKeyId: process.env.BUCKET_ACCESS_KEY,
      secretAccessKey: process.env.BUCKET_SECRET_KEY,
    });
  }

  async replaceLastPage(
    pdfBase64: string,
    imageFileSignature: Express.Multer.File,
  ) {
    pdfBase64 = pdfBase64.replace('data:application/pdf;base64,', '');

    const pdfBytes = Buffer.from(pdfBase64, 'base64');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const numPages = pages.length;

    // Remove a última página
    pdfDoc.removePage(numPages - 1);

    // Adiciona uma nova página
    const novaPagina = pdfDoc.addPage();

    // Embutir a imagem na nova página (usando o buffer do Multer)
    const imagemPdf = await pdfDoc.embedPng(imageFileSignature.buffer);

    const paginaLargura = novaPagina.getWidth();
    const paginaAltura = novaPagina.getHeight();
    const imagemLargura = imagemPdf.width;
    const imagemAltura = imagemPdf.height;

    let escala = 1; // Começa com escala 1:1 (tamanho original)

    // Se a imagem for maior que a página em alguma dimensão, calcula a escala
    if (imagemLargura > paginaLargura || imagemAltura > paginaAltura) {
      escala = Math.min(
        paginaLargura / imagemLargura,
        paginaAltura / imagemAltura,
      );
    }

    const { width, height } = imagemPdf.scale(escala); // Aplica a escala, se necessário

    // --- Fim dos ajustes ---

    novaPagina.drawImage(imagemPdf, {
      x: novaPagina.getWidth() / 2 - width / 2,
      y: novaPagina.getHeight() / 2 - height / 2,
      width: width,
      height: height,
    });

    // Salva o PDF modificado
    const pdfModificado = await pdfDoc.save();

    // --- Ajustar o retorno da função ---
    return Buffer.from(pdfModificado);
  }

  async convertPDFinImage(base64) {
    return new Promise(async (resolve, reject) => {
      try {
        base64 = base64.replace('data:application/pdf;base64,', '');
        const buffer = await Buffer.from(base64, 'base64');
        const poppler = new Poppler();
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();

        const options = {
          lastPageToConvert: pages.length,
          pngFile: true,
        };

        poppler
          .pdfToCairo(buffer, './temp/example.png', options)
          .then(async (res) => {
            const response = await ConvertImageToBase64(
              `./temp/example.png-${pages.length}.png`,
            );
            resolve(`data:image/png;base64,${response}`);
          })
          .catch((err) => {
            console.error(err);
            reject(err); // Rejeita a promise com o erro
          });
      } catch (error) {
        console.error('Erro ao converter PDF para imagem:', error);
        reject(error); // Rejeita a promise com o erro
      }
    });
  }

  async getFileFromBucket(key: string): Promise<any> {
    try {
      const fileData = await this.bucket
        .getObject({ Bucket: this.bucketName, Key: key })
        .promise();
      const base64Data = fileData.Body.toString('base64');
      // console.log("base64Data", base64Data);
      return {
        ContentType: fileData.ContentType, // Retorna o tipo do arquivo
        base64Data: `data:${fileData.ContentType};base64,${base64Data}`, // Retorna o arquivo em base64
      };
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null; // Retorna null se o arquivo não existir
      }
      throw new Error(`Erro ao buscar o arquivo do bucket: ${error.message}`);
    }
  }

  async getAllFilesChildrenFromBucket(cpf: string) {
    let childrens: AWS.S3.ObjectList = [];
    let data: AWS.S3.ListObjectsV2Output;
    let finishDates: any[] = [];
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: this.bucketName, // Nome do bucket
      Prefix: `collaborator/${cpf}/Birth_Certificate/`, // Nome da pasta
    };

    try {
      do {
        // Faz a chamada para listar os arquivos
        data = await this.bucket.listObjectsV2(params).promise();
        childrens = childrens.concat(data.Contents); // Adiciona os arquivos à lista
        params.ContinuationToken = data.NextContinuationToken; // Atualiza o token para buscar mais arquivos
      } while (data.IsTruncated); // Continua

      // await childrens.map(async children  => {
      //   if (children.Key) {
      //     const base64File = await this.getFileFromBucket(children.Key); // Chama sua função para obter o arquivo em base64
      //     const match = children.Key.match(/([^_/]+)$/);
      //     base64File.name = match[1]
      //     finishDates.push(base64File)
      //   }
      // });

      for (const children of childrens) {
        if (children.Key) {
          const base64File = await this.getFileFromBucket(children.Key); // Chama sua função para obter o arquivo em base64
          const match = children.Key.match(/([^_/]+)$/);
          base64File.name = match ? match[1] : null; // Adiciona o nome extraído
          base64File.type =
            base64File.ContentType == 'application/pdf' ? 'pdf' : 'picture';
          finishDates.push(base64File);
        }
      }

      return finishDates;
    } catch (e) {
      console.log(e);
    }
  }

  async isDocumentPresent(path: string): Promise<boolean> {
    const params = {
      Bucket: this.bucketName,
      Key: path,
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
  }

  async checkPaste(folderPath: string): Promise<{ [key: number]: string }> {
    const bucketName = this.bucketName;
    const result: { [key: number]: string } = {};

    try {
      console.log('Iniciando checkPaste com folderPath:', folderPath);
      console.log('bucketName:', bucketName);

      // Lista os objetos no bucket
      const data = await this.bucket
        .listObjectsV2({
          Bucket: bucketName,
          Prefix: folderPath, // Prefixo para listar arquivos dentro da pasta
        })
        .promise();

      console.log('Dados retornados do bucket:', data);

      // Se os arquivos existirem, processa os nomes
      if (data.Contents) {
        console.log('Quantidade de arquivos encontrados:', data.Contents.length);
        
        let index = 0; // Inicializa o índice
        data.Contents.forEach((item) => {
          console.log('Processando item:', item);
          
          if (item.Key) {
            // Extrai o nome do arquivo removendo o caminho completo
            const fileName = item.Key.replace(folderPath, '');
            console.log('Nome do arquivo extraído:', fileName);
            
            if (fileName) {
              result[index] = fileName;
              console.log(`Adicionando ao resultado - índice ${index}:`, fileName);
              index++;
            }
          }
        });
      }

      console.log('Resultado final:', result);
      return result;
    } catch (error) {
      console.error(
        'Erro ao verificar os arquivos dinâmicos no bucket:',
        error.message,
      );
      console.error('Stack trace completo:', error);
      throw new Error(
        'Não foi possível verificar os arquivos dinâmicos no bucket.',
      );
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: path,
      };
      const response = await this.bucket.deleteObject(params).promise();
      if (response) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      return false;
    }
  }

  async GenerateAccess(path: string) {
    const params = {
      Bucket: 'newgep',
      Key: path,
      Expires: 5000, // A URL será válida por 60 segundos
    };

    const url = this.bucket.getSignedUrl('getObject', params);
    return url;
  }

  async UploadCollaborator(
    file: Express.Multer.File,
    name: string,
    side: string,
    cpf: string,
  ) {
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
        case 'voter_registration':
          path = `collaborator/${cpf}/Voter_Registration/${side}`;
          break;
        case 'medical_examination':
          path = `collaborator/${cpf}/Medical_Examination`;
          break;
        default:
          return {
            status: 400,
            message: `Tipo de documento não suportado: ${name}`,
          };
      }
    }

    const mimeType =
      file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype;

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
  }

  async findCollaborator(cpf: string, name: string) {
    try {
      if (name.toLowerCase().includes('birth_certificate')) {
        const birthKey = `collaborator/${cpf}/Birth_Certificate/${name}`;
        const birthFile = await this.getFileFromBucket(birthKey);

        if (birthFile?.ContentType === 'application/pdf') {
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
      } else {
        switch (name.toLowerCase()) {
          case 'rg':
            const rgPdfKey = `collaborator/${cpf}/RG/complet`; // Caso seja um PDF completo
            const rgFrontKey = `collaborator/${cpf}/RG/front`; // Caso tenha "front"
            const rgBackKey = `collaborator/${cpf}/RG/back`; // Caso tenha "back"

            // Tentar buscar o PDF completo primeiro
            const rgFile = await this.getFileFromBucket(rgPdfKey);
            if (rgFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(rgPdfKey);
              return {
                status: 200,
                type: 'pdf',
                path: rgFile.base64Data,
                url: url, // Retorna o PDF completo em base64
              };
            }

            // Se o PDF não existir, tentar buscar as imagens front e back
            const frontFile = await this.getFileFromBucket(rgFrontKey);
            const backFile = await this.getFileFromBucket(rgBackKey);

            // Retorna as imagens em base64
            return {
              status: 200,
              type: 'picture',
              path: [frontFile.base64Data, backFile.base64Data], // Retorna front e back como um array
            };

          case 'address':
            const addressKey = `collaborator/${cpf}/Address`;
            const addressFile = await this.getFileFromBucket(addressKey);

            if (addressFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(addressKey);
              return {
                status: 200,
                type: 'pdf',
                path: url,
              };
            }

            return {
              status: 200,
              type: 'picture',
              path: addressFile.base64Data,
            };

          case 'work_card':
            const workCardPdfKey = `collaborator/${cpf}/Work_Card/complet`;
            const workCardFrontKey = `collaborator/${cpf}/Work_Card/front`;
            const workCardBackKey = `collaborator/${cpf}/Work_Card/back`;

            // Buscar PDF completo do Work Card
            const workCardPdf = await this.getFileFromBucket(workCardPdfKey);
            if (workCardPdf?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(workCardPdfKey);
              return {
                status: 200,
                type: 'pdf',
                path: workCardPdf.base64Data,
                url: url,
              };
            }

            // Caso não tenha PDF, busca imagens front/back
            const workCardFront =
              await this.getFileFromBucket(workCardFrontKey);
            const workCardBack = await this.getFileFromBucket(workCardBackKey);

            return {
              status: 200,
              type: 'picture',
              path: [workCardFront.base64Data, workCardBack.base64Data],
            };

          case 'school_history':
            const schoolHistoryKey = `collaborator/${cpf}/School_History`;
            const schoolHistoryFile =
              await this.getFileFromBucket(schoolHistoryKey);

            if (schoolHistoryFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(schoolHistoryKey);
              return {
                status: 200,
                type: 'pdf',
                path: schoolHistoryFile.base64Data,
                url: url,
              };
            }

            return {
              status: 200,
              type: 'picture',
              path: schoolHistoryFile.base64Data, // conteúdo base64 do PDF
            };

          case 'cnh':
            const cnhPdfKey = `collaborator/${cpf}/CNH/complet`; // Caso seja um PDF completo
            const cnhFrontKey = `collaborator/${cpf}/CNH/front`; // Caso tenha "front"
            const cnhBackKey = `collaborator/${cpf}/CNH/back`; // Caso tenha "back"

            // Tentar buscar o PDF completo primeiro
            const cnhFile = await this.getFileFromBucket(cnhPdfKey);
            const url = await this.GenerateAccess(cnhPdfKey);
            if (cnhFile?.ContentType === 'application/pdf') {
              return {
                status: 200,
                type: 'pdf',
                path: cnhFile.base64Data, // Retorna o PDF completo em base64
                url: url,
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

            if (militaryFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(militaryKey);
              return {
                status: 200,
                type: 'pdf',
                path: militaryFile.base64Data, // Retorna o PDF completo em base64
                url: url,
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

            if (marriageFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(marriageKey);
              return {
                status: 200,
                type: 'pdf',
                path: marriageFile.base64Data, // Retorna o PDF completo em base64
                url: url,
              };
            }

            return {
              status: 200,
              type: 'picture',
              path: marriageFile.base64Data, // arquivo base64 de endereço
            };

          case 'children_certificate':
            const response = await this.getAllFilesChildrenFromBucket(cpf);
            return {
              status: 200,
              type: 'children',
              path: response, // arquivo base64 de endereço
            };

          case 'voter_registration':
            const voterPdfKey = `collaborator/${cpf}/Voter_Registration/complet`; // Caso seja um PDF completo
            const voterFrontKey = `collaborator/${cpf}/Voter_Registration/front`; // Caso tenha "front"
            const voterBackKey = `collaborator/${cpf}/Voter_Registration/back`; // Caso tenha "back"

            // Tentar buscar o PDF completo primeiro
            const voterFile = await this.getFileFromBucket(voterPdfKey);
            if (voterFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(voterPdfKey);
              return {
                status: 200,
                type: 'pdf',
                path: voterFile.base64Data,
                url: url, // Retorna o PDF completo em base64
              };
            }

            // Se o PDF não existir, tentar buscar as imagens front e back
            const voterFrontFile = await this.getFileFromBucket(voterFrontKey);
            const voterBackFile = await this.getFileFromBucket(voterBackKey);

            // Retorna as imagens em base64
            return {
              status: 200,
              type: 'picture',
              path: [voterFrontFile.base64Data, voterBackFile.base64Data], // Retorna front e back como um array
            };

          case 'picture':
            const pictureKey = `collaborator/${cpf}/Picture`;
            const pictureFile = await this.getFileFromBucket(pictureKey);

            return {
              status: 200,
              type: 'picture',
              path: pictureFile.base64Data, // arquivo base64 de endereço
            };

          case 'medical_examination':
            const medicalKey = `collaborator/${cpf}/Medical_Examination`;
            const medicalFile = await this.getFileFromBucket(medicalKey);

            if (medicalFile?.ContentType === 'application/pdf') {
              const url = await this.GenerateAccess(medicalKey);

              return {
                status: 200,
                type: 'pdf',
                path: medicalFile.base64Data, // Retorna o PDF completo em base64
                url: url,
              };
            }

            return {
              status: 200,
              type: 'picture',
              path: medicalFile.base64Data, // arquivo base64 de endereço
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
  }

  async checkCollaboratorBucketDocuments(collaborator: any) {
    const missingDocuments = [];
    const missingDocumentsChildren = [];

    // Verifica a presença do documento de RG (se o PDF estiver presente, dispensa as imagens)
    const rgPdfExists = await this.isDocumentPresent(
      `collaborator/${collaborator.CPF}/RG/complet`,
    );
    let rgDocumentMissing = false;
    if (!rgPdfExists) {
      const rgFrontExists = await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/RG/front`,
      );
      const rgBackExists = await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/RG/back`,
      );
      // Se nem o PDF, nem o Front, nem o Back existem, considera o RG como faltante
      if (!rgFrontExists || !rgBackExists) {
        rgDocumentMissing = true;
      }
    }
    if (rgDocumentMissing) {
      missingDocuments.push('RG');
    }
    
    // Verifica a presença do documento de Work Card (se o PDF estiver presente, dispensa as imagens)
    const workCardPdfExists = await this.isDocumentPresent(
      `collaborator/${collaborator.CPF}/Work_Card/complet`,
    );
    let workCardDocumentMissing = false;
    if (!workCardPdfExists) {
      const workCardFrontExists = await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/Work_Card/front`,
      );
      const workCardBackExists = await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/Work_Card/back`,
      );
      // Se nem o PDF, nem o Front, nem o Back existem, considera o Work Card como faltante
      if (!workCardFrontExists || !workCardBackExists) {
        workCardDocumentMissing = true;
      }
    }
    if (workCardDocumentMissing) {
      missingDocuments.push('Work_Card');
    }

    // Verifica os comprovantes de endereço
    const addressDocuments = ['Address', 'Address.pdf'];

    let documentFound = false;

    // Verifica se pelo menos um dos documentos existe
    for (const document of addressDocuments) {
      if (
        await this.isDocumentPresent(
          `collaborator/${collaborator.CPF}/${document}`,
        )
      ) {
        documentFound = true;
        break; // Se encontrar um dos documentos, sai do loop
      }
    }

    // Se nenhum dos documentos foi encontrado, adiciona ao array de documentos faltantes
    if (!documentFound) {
      missingDocuments.push('Address');
    }

    if (collaborator.children == 0) {
      // Se for a string "0", não há filhos, então não exigimos nenhum documento
    } else if (
      typeof collaborator.children === 'object' &&
      !Array.isArray(collaborator.children)
    ) {
      // Se for um objeto, percorremos os filhos e verificamos os documentos
      for (const childKey in collaborator.children) {
        if (collaborator.children.hasOwnProperty(childKey)) {
          const child = collaborator.children[childKey];
          const childName = Mask('firstName', child.name);
          // Lista de documentos a serem verificados para cada filho
          const childrenDocuments = [`Birth_Certificate_${childName}`];

          // Verifica se o documento está presente
          for (const document of childrenDocuments) {
            const documentPath = `Birth_Certificate/Birth_Certificate_${childName}`;
            if (
              !(await this.isDocumentPresent(
                `collaborator/${collaborator.CPF}/${documentPath}`,
              ))
            ) {
              if (!missingDocuments.includes(document)) {
                missingDocuments.push('Birth_Certificate'); // Adiciona o documento uma única vez
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
      if (collaborator.marriage != '0') {
        const marriageDocuments = ['Marriage_Certificate'];
        for (const document of marriageDocuments) {
          if (
            !(await this.isDocumentPresent(
              `collaborator/${collaborator.CPF}/${document}`,
            ))
          ) {
            missingDocuments.push(document);
          }
        }
      }
    }

    if (collaborator.sex) {
      if (collaborator.sex == 'M') {
        const militaryDocuments = ['Military_Certificate'];
        for (const document of militaryDocuments) {
          if (
            !(await this.isDocumentPresent(
              `collaborator/${collaborator.CPF}/${document}`,
            ))
          ) {
            missingDocuments.push(document);
          }
        }
      }
    }

    // Verifica se a foto do colaborador está presente
    if (
      !(await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/Picture`,
      ))
    ) {
      missingDocuments.push('Picture');
    }

    // Verifica se o Certificate School está presente
    if (
      !(await this.isDocumentPresent(
        `collaborator/${collaborator.CPF}/School_History`,
      ))
    ) {
      missingDocuments.push('School_History');
    }

    return {
      status: 200,
      missingDocuments: missingDocuments.length > 0 ? missingDocuments : null,
      missingDocumentsChildren:
        missingDocumentsChildren.length > 0 ? missingDocumentsChildren : null,
    };
  }

  // Job Dismissal

  async checkJobDismissalBucketDocumentsObligation(id: number) {
    //
    let documentDynamic = await this.checkPaste(`job/${id}/Dismissal/Dynamic/`);
    documentDynamic = Object.fromEntries(
      Object.entries(documentDynamic).filter(
        ([_, value]) => !value.startsWith('Communication/'),
      ),
    );
    const documentDynamicCommunication = await this.checkPaste(
      `job/${id}/Dismissal/Dynamic/Communication`,
    );
    const documentDynamicCommunicationComplet = await this.checkPaste(
      `job/${id}/Dismissal/Complet/Communication`,
    );
    const documentSignatureCommunication = await this.checkPaste(
      `job/${id}/Dismissal/Signature/Communication`,
    );
    const signatureDynamic = await this.checkPaste(
      `job/${id}/Dismissal/Signature/Dynamic`,
    );
    //
    let documentSignature = await this.checkPaste(
      `job/${id}/Dismissal/Complet/`,
    );
    documentSignature = Object.fromEntries(
      Object.entries(documentSignature).filter(
        ([_, value]) => !value.startsWith('Communication/'),
      ),
    );
    return {
      status: 200,
      date: {
        dynamic: {
          communication: {
            document: documentDynamicCommunication,
            signature: documentSignatureCommunication,
            complet: documentDynamicCommunicationComplet,
          },
          document: documentDynamic,
          signature: signatureDynamic,
        },
        documentSignature: documentSignature,
      },
    };
  }

  // Job Admission

  async checkJobAdmissionBucketDocumentsObligation(id: number) {
    const registration = await this.isDocumentPresent(
      `job/${id}/Admission/Registration_Form`,
    );
    const experience = await this.isDocumentPresent(
      `job/${id}/Admission/Experience_Contract`,
    );
    const extension = await this.isDocumentPresent(
      `job/${id}/Admission/Hours_Extension`,
    );
    const compensation = await this.isDocumentPresent(
      `job/${id}/Admission/Hours_Compensation`,
    );
    const voucher = await this.isDocumentPresent(
      `job/${id}/Admission/Transport_Voucher`,
    );
    const medical = await this.isDocumentPresent(
      `job/${id}/Admission/Medical_Examination`,
    );
    //
    const registrationSignature = await this.isDocumentPresent(
      `job/${id}/Admission/Signature/Registration_Form`,
    );
    const experienceSignature = await this.isDocumentPresent(
      `job/${id}/Admission/Signature/Experience_Contract`,
    );
    const extensionSignature = await this.isDocumentPresent(
      `job/${id}/Admission/Signature/Hours_Extension`,
    );
    const compensationSignature = await this.isDocumentPresent(
      `job/${id}/Admission/Signature/Hours_Compensation`,
    );
    const voucherSignature = await this.isDocumentPresent(
      `job/${id}/Admission/Signature/Transport_Voucher`,
    );
    //
    const documentDynamic = await this.checkPaste(
      `job/${id}/Admission/Dynamic/`,
    );
    const signatureDynamic = await this.checkPaste(
      `job/${id}/Admission/Signature/Dynamic`,
    );
    //
    const documentSignature = await this.checkPaste(
      `job/${id}/Admission/Complet/`,
    );

    return {
      status: 200,
      date: {
        obligation: {
          medical: medical,
          registration: registration,
          experience: experience,
          extension: extension,
          compensation: compensation,
          voucher: voucher,
        },
        signature: {
          registration: registrationSignature,
          experience: experienceSignature,
          extension: extensionSignature,
          compensation: compensationSignature,
          voucher: voucherSignature,
        },
        dynamic: {
          document: documentDynamic,
          signature: signatureDynamic,
        },
        documentSignature: documentSignature,
      },
    };
  }

  async UploadJob(
    file: Express.Multer.File,
    name: string,
    signature: any,
    id: number,
    dynamic?: string,
  ) {
    // console.log(name);
    let path: string;
    let parts: string[] = [];
    let year: string;
    let month: string;
    switch (name.toLowerCase()) {
      case 'registration':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Registration_Form`;
          break;
        }
        path = `job/${id}/Admission/Registration_Form`;
        break;
      case 'experience':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Experience_Contract`;
          break;
        }
        path = `job/${id}/Admission/Experience_Contract`;
        break;
      case 'extension':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Hours_Extension`;
          break;
        }
        path = `job/${id}/Admission/Hours_Extension`;
        break;
      case 'compensation':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Hours_Compensation`;
          break;
        }
        path = `job/${id}/Admission/Hours_Compensation`;
        break;
      case 'voucher':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Transport_Voucher`;
          break;
        }
        path = `job/${id}/Admission/Transport_Voucher`;
        break;
      case 'dynamic':
        if (signature == '1') {
          path = `job/${id}/Admission/Signature/Dynamic/${dynamic}`;
          break;
        }
        path = `job/${id}/Admission/Dynamic/${dynamic}`;
        break;
      case 'medical':
        path = `job/${id}/Admission/Medical_Examination`;
        break;
      case 'admission_signature':
        path = `job/${id}/Admission/Signature/Collaborator`;
        break;
      case 'dismissal_signature':
        path = `job/${id}/Dismissal/Signature/Collaborator`;
        break;
      case 'dismissal_communication_dynamic':
        if (signature == '1') {
          path = `job/${id}/Dismissal/Signature/Communication/Dynamic/Collaborator`;
          break;
        }
        path = `job/${id}/Dismissal/Dynamic/Communication/${dynamic}`;
        break;
      case 'dismissal_kit_dynamic':
        if (signature == '1') {
          path = `job/${id}/Dismissal/Signature/Dynamic/Collaborator`;
          break;
        }
        path = `job/${id}/Dismissal/Dynamic/${dynamic}`;
        break;
      case 'dismissal_hand':
        path = `job/${id}/Dismissal/Dismissal_Hand`;
        break;
      case 'dismissal_medical_examination':
        path = `job/${id}/Dismissal/Medical_Examination`;
        break;
      case 'paystub_signature':
        // console.log('dynamic', dynamic);
        parts = dynamic.split('_');
        year = parts[2];
        month = parts[3];
        path = `job/${id}/PayStub/${year}/${month}/${dynamic}`;
        break;
      case 'point_signature':
        // console.log('dynamic', dynamic);
        parts = dynamic.split('_');
        year = parts[2];
        month = parts[3];
        path = `job/${id}/Point/${year}/${month}/${dynamic}`;
        
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    }

    const mimeType =
      file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype;
    const jobFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: mimeType,
    };

    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(jobFile).promise();
      // console.log(s3Response);
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

  async UploadJobFileSignature(
    file: Express.Multer.File,
    name: string,
    id: number,
    dynamic?: string,
  ) {
    let pathOrigin: string;
    let path: string;
    let response: any;
    let newPDF: any;
    switch (name.toLowerCase()) {
      case 'registration_form':
        pathOrigin = `job/${id}/Admission/Registration_Form`;
        path = `job/${id}/Admission/Complet/Registration_Form`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }

        break;
      case 'experience_contract':
        pathOrigin = `job/${id}/Admission/Experience_Contract`;
        path = `job/${id}/Admission/Complet/Experience_Contract`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'hours_extension':
        pathOrigin = `job/${id}/Admission/Hours_Extension`;
        path = `job/${id}/Admission/Complet/Hours_Extension`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'hours_compensation':
        pathOrigin = `job/${id}/Admission/Hours_Compensation`;
        path = `job/${id}/Admission/Complet/Hours_Compensation`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'transport_voucher':
        pathOrigin = `job/${id}/Admission/Transport_Voucher`;
        path = `job/${id}/Admission/Complet/Transport_Voucher`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'dynamic':
        pathOrigin = `job/${id}/Admission/Dynamic/${dynamic}`;
        path = `job/${id}/Admission/Complet/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'dismissal_dynamic':
        pathOrigin = `job/${id}/Dismissal/Dynamic/${dynamic}`;
        path = `job/${id}/Dismissal/Complet/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      case 'dismissal_communication_dynamic':
        pathOrigin = `job/${id}/Dismissal/Dynamic/Communication/${dynamic}`;
        path = `job/${id}/Dismissal/Complet/Communication/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceLastPage(response.base64Data, file);
        }
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    }
    const mimeType =
      response && response.ContentType.includes('pdf')
        ? 'application/pdf'
        : file.mimetype;
    const fileSignature = {
      Bucket: this.bucketName,
      Key: path,
      Body:
        response && response.ContentType.includes('pdf') ? newPDF : file.buffer,
      ContentType: mimeType,
    };
    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(fileSignature).promise();
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

  async DeleteDocumentDynamic(id: number, name: string, where?: string) {
    try {
      let document;
      let signature;
      let complet;
      switch (where) {
        case 'communication':
          document = await this.deleteFile(
            `job/${id}/Dismissal/Dynamic/Communication/${name}`,
          );
          complet = await this.deleteFile(
            `job/${id}/Dismissal/Complet/Communication/${name}`,
          );
          break;
        case 'kitDismissal':
          document = await this.deleteFile(
            `job/${id}/Dismissal/Dynamic/${name}`,
          );
          complet = await this.deleteFile(
            `job/${id}/Dismissal/Complet/${name}`,
          );
          break;
        default:
          document = await this.deleteFile(
            `job/${id}/Admission/Dynamic/${name}`,
          );
          signature = await this.deleteFile(
            `job/${id}/Admission/Signature/Dynamic/${name}`,
          );
          break;
      }

      return {
        status: 200,
        document: document,
        signature: signature,
      };
    } catch (e) {
      return {
        status: 500,
        message: 'Erro ao excluir o documento dinâmico',
      };
    }
  }

  async findJob(id: number, name: string, signature: any, dynamic?: string) {
    switch (name.toLowerCase()) {
      case 'registration':
        if (signature == '1') {
          const registrationSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const registrationSignatureFile = await this.getFileFromBucket(
            registrationSignatureKey,
          );
          const registrationSignatureCompletKey = `job/${id}/Admission/Complet/Registration_Form`;
          const registrationSignatureCompletFile = await this.getFileFromBucket(
            registrationSignatureCompletKey,
          );

          if (!registrationSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (registrationSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: registrationSignatureFile.base64Data,
              typeDocumentSignature:
                registrationSignatureCompletFile?.ContentType ===
                'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature:
                registrationSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: registrationSignatureFile.base64Data,
            typeDocumentSignature:
              registrationSignatureCompletFile?.ContentType ===
              'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: registrationSignatureCompletFile?.base64Data,
          };
        } else {
          const registrationKey = `job/${id}/Admission/Registration_Form`;
          const registrationFile =
            await this.getFileFromBucket(registrationKey);
          if (!registrationFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (registrationFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              registrationFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: registrationFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: registrationFile.base64Data,
          };
        }
        break;
      case 'experience':
        if (signature == '1') {
          const experienceSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const experienceSignatureFile = await this.getFileFromBucket(
            experienceSignatureKey,
          );
          const experienceSignatureCompletKey = `job/${id}/Admission/Complet/Experience_Contract`;
          const experienceSignatureCompletFile = await this.getFileFromBucket(
            experienceSignatureCompletKey,
          );
          // console.log(experienceSignatureCompletFile);
          if (!experienceSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (experienceSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: experienceSignatureFile.base64Data,
              typeDocumentSignature:
                experienceSignatureCompletFile?.ContentType ===
                'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: experienceSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: experienceSignatureFile.base64Data,
            typeDocumentSignature:
              experienceSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: experienceSignatureCompletFile?.base64Data,
          };
        } else {
          const experienceKey = `job/${id}/Admission/Experience_Contract`;
          const experienceFile = await this.getFileFromBucket(experienceKey);

          if (!experienceFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (experienceFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              experienceFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: experienceFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: experienceFile.base64Data,
          };
        }
        break;
      case 'extension':
        if (signature == '1') {
          const extensionSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const extensionSignatureFile = await this.getFileFromBucket(
            extensionSignatureKey,
          );
          const extensionSignatureCompletKey = `job/${id}/Admission/Complet/Hours_Extension`;
          const extensionSignatureCompletFile = await this.getFileFromBucket(
            extensionSignatureCompletKey,
          );

          if (!extensionSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (extensionSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: extensionSignatureFile.base64Data,
              typeDocumentSignature:
                extensionSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: extensionSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: extensionSignatureFile.base64Data,
            typeDocumentSignature:
              extensionSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: extensionSignatureCompletFile?.base64Data,
          };
        } else {
          const extensionKey = `job/${id}/Admission/Hours_Extension`;
          const extensionFile = await this.getFileFromBucket(extensionKey);

          if (!extensionFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (extensionFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              extensionFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: extensionFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: extensionFile.base64Data,
          };
        }
        break;
      case 'compensation':
        if (signature == '1') {
          const compensationSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const compensationSignatureFile = await this.getFileFromBucket(
            compensationSignatureKey,
          );
          const compensationSignatureCompletKey = `job/${id}/Admission/Complet/Hours_Compensation`;
          const compensationSignatureCompletFile = await this.getFileFromBucket(
            compensationSignatureCompletKey,
          );

          if (!compensationSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (compensationSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: compensationSignatureFile.base64Data,
              typeDocumentSignature:
                compensationSignatureCompletFile?.ContentType ===
                'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature:
                compensationSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: compensationSignatureFile.base64Data,
            typeDocumentSignature:
              compensationSignatureCompletFile?.ContentType ===
              'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: compensationSignatureCompletFile?.base64Data,
          };
        } else {
          const compensationKey = `job/${id}/Admission/Hours_Compensation`;
          const compensationFile =
            await this.getFileFromBucket(compensationKey);

          if (!compensationFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (compensationFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              compensationFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: compensationFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: compensationFile.base64Data,
          };
        }
        break;
      case 'voucher':
        if (signature == '1') {
          const voucherSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const voucherSignatureFile =
          await this.getFileFromBucket(voucherSignatureKey);
          const voucherSignatureCompletKey = `job/${id}/Admission/Complet/Transport_Voucher`;
          const voucherSignatureCompletFile = await this.getFileFromBucket(
            voucherSignatureCompletKey,
          );

          if (!voucherSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (voucherSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: voucherSignatureFile.base64Data,
              typeDocumentSignature:
                voucherSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: voucherSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: voucherSignatureFile.base64Data,
            typeDocumentSignature:
              voucherSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: voucherSignatureCompletFile?.base64Data,
          };
        } else {
          const voucherKey = `job/${id}/Admission/Transport_Voucher`;
          const voucherFile = await this.getFileFromBucket(voucherKey);

          if (!voucherFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (voucherFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              voucherFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: voucherFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: voucherFile.base64Data,
          };
        }
        break;
      case 'dynamic':
        if (signature == '1') {
          const dynamicSignatureKey = `job/${id}/Admission/Signature/Collaborator`;
          const dynamicSignatureFile =
            await this.getFileFromBucket(dynamicSignatureKey);
          const dynamicSignatureCompletKey = `job/${id}/Admission/Complet/${dynamic}`;
          const dynamicSignatureCompletFile = await this.getFileFromBucket(
            dynamicSignatureCompletKey,
          );

          if (!dynamicSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (dynamicSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: dynamicSignatureFile.base64Data,
              typeDocumentSignature:
                dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: dynamicSignatureFile.base64Data,
            typeDocumentSignature:
              dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
          };
        } else {
          const DynamicKey = `job/${id}/Admission/Dynamic/${dynamic}`;
          const DynamicFile = await this.getFileFromBucket(DynamicKey);

          if (!DynamicFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (DynamicFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              DynamicFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: DynamicFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: DynamicFile.base64Data,
          };
        }
        break;
      case 'medical':
        const medicalKey = `job/${id}/Admission/Medical_Examination`;
        const medicalFile = await this.getFileFromBucket(medicalKey);

        if (!medicalFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        if (medicalFile?.ContentType === 'application/pdf') {
          const url = await this.GenerateAccess(medicalKey);
          return {
            status: 200,
            type: 'pdf',
            path: medicalFile.base64Data, // Retorna o PDF completo em base64
            url: url,
          };
        }

        return {
          status: 200,
          type: 'picture',
          path: medicalFile.base64Data, // arquivo base64 de endereço
        };
      case 'dismissal_medical_examination':
        const medicalDismissalKey = `job/${id}/Dismissal/Dismissal_Medical_Examination`;
        const medicalDismissalFile =
          await this.getFileFromBucket(medicalDismissalKey);

        if (!medicalDismissalFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }
        if (medicalDismissalFile?.ContentType === 'application/pdf') {
          const url = await this.GenerateAccess(medicalDismissalKey);
          return {
            status: 200,
            type: 'pdf',
            path: medicalDismissalFile.base64Data, // Retorna o PDF completo em base64
            url: url,
          };
        }
        return {
          status: 200,
          type: 'picture',
          path: medicalDismissalFile.base64Data, // arquivo base64 de endereço
        };
      case 'dismissal_hand':
        const dismissalHandKey = `job/${id}/Dismissal/Dismissal_Hand`;
        const dismissalHandFile =
          await this.getFileFromBucket(dismissalHandKey);

        if (!dismissalHandFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        if (dismissalHandFile?.ContentType === 'application/pdf') {
          const url = await this.GenerateAccess(medicalKey);
          return {
            status: 200,
            type: 'pdf',
            path: dismissalHandFile.base64Data, // Retorna o PDF completo em base64
            url: url,
          };
        }

        return {
          status: 200,
          type: 'picture',
          path: dismissalHandFile.base64Data, // arquivo base64 de endereço
        };
      case 'dismissal_dynamic':
        if (signature == '1') {
          const dynamicSignatureKey = `job/${id}/Dismissal/Signature/Dynamic/${dynamic}`;
          const dynamicSignatureFile =
            await this.getFileFromBucket(dynamicSignatureKey);
          const dynamicSignatureCompletKey = `job/${id}/Dismissal/Complet/${dynamic}`;
          const dynamicSignatureCompletFile = await this.getFileFromBucket(
            dynamicSignatureCompletKey,
          );

          if (!dynamicSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (dynamicSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: dynamicSignatureFile.base64Data,
              typeDocumentSignature:
                dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: dynamicSignatureFile.base64Data,
            typeDocumentSignature:
              dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
          };
        } else {
          const DynamicKey = `job/${id}/Dismissal/Dynamic/${dynamic}`;
          const DynamicFile = await this.getFileFromBucket(DynamicKey);

          if (!DynamicFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (DynamicFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              DynamicFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: DynamicFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: DynamicFile.base64Data,
          };
        }
        break;
      case 'dismissal_communication_dynamic':
        if (signature == '1') {
          const dynamicSignatureKey = `job/${id}/Dismissal/Signature/Communication`;
          const dynamicSignatureFile =
            await this.getFileFromBucket(dynamicSignatureKey);
          const dynamicSignatureCompletKey = `job/${id}/Dismissal/Complet/Communication/${dynamic}`;
          const dynamicSignatureCompletFile = await this.getFileFromBucket(
            dynamicSignatureCompletKey,
          );

          if (!dynamicSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (dynamicSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: dynamicSignatureFile.base64Data,
              typeDocumentSignature:
                dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: dynamicSignatureFile.base64Data,
            typeDocumentSignature:
              dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
          };
        } else {
          const DynamicKey = `job/${id}/Dismissal/Dynamic/Communication/${dynamic}`;
          const DynamicFile = await this.getFileFromBucket(DynamicKey);
          if (dynamic == 'TesteTeste') {
            console.log(DynamicFile);
          }
          if (!DynamicFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (DynamicFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              DynamicFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: DynamicFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: DynamicFile.base64Data,
          };
        }
        break;
      case 'dismissal_kit_dynamic':
        if (signature == '1') {
          const dynamicSignatureKey = `job/${id}/Dismissal/Signature/Collaborator`;
          const dynamicSignatureFile =
            await this.getFileFromBucket(dynamicSignatureKey);
          const dynamicSignatureCompletKey = `job/${id}/Dismissal/Complet/${dynamic}`;
          const dynamicSignatureCompletFile = await this.getFileFromBucket(
            dynamicSignatureCompletKey,
          );

          if (!dynamicSignatureFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (dynamicSignatureFile?.ContentType === 'application/pdf') {
            return {
              status: 200,
              type: 'pdf',
              path: dynamicSignatureFile.base64Data,
              typeDocumentSignature:
                dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                  ? 'pdf'
                  : 'picture',
              pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: dynamicSignatureFile.base64Data,
            typeDocumentSignature:
              dynamicSignatureCompletFile?.ContentType === 'application/pdf'
                ? 'pdf'
                : 'picture',
            pathDocumentSignature: dynamicSignatureCompletFile?.base64Data,
          };
        } else {
          const DynamicKey = `job/${id}/Dismissal/Dynamic/${dynamic}`;
          const DynamicFile = await this.getFileFromBucket(DynamicKey);

          if (!DynamicFile) {
            return {
              status: 404,
              message: 'Arquivo não encontrado',
            };
          }

          if (DynamicFile?.ContentType === 'application/pdf') {
            const imageBase64 = await this.convertPDFinImage(
              DynamicFile.base64Data,
            );
            return {
              status: 200,
              type: 'pdf',
              path: DynamicFile.base64Data,
              picture: imageBase64,
            };
          }

          return {
            status: 200,
            type: 'picture',
            path: DynamicFile.base64Data,
          };
        }
        break;
      case 'dismissal_medical':
        const dismissalMedicalKey = `job/${id}/Dismissal/Medical_Examination`;
        const dismissalMedicalFile =
          await this.getFileFromBucket(dismissalMedicalKey);

        if (!dismissalMedicalFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        if (dismissalMedicalFile?.ContentType === 'application/pdf') {
          const url = await this.GenerateAccess(dismissalMedicalKey);
          return {
            status: 200,
            type: 'pdf',
            path: dismissalMedicalFile.base64Data, // Retorna o PDF completo em base64
            url: url,
          };
        }

        return {
          status: 200,
          type: 'picture',
          path: dismissalMedicalFile.base64Data, // arquivo base64 de endereço
        };
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    }
  }

  // Job Services

  async findServices(id: any, typeService: any, year: any, month: any) {
    const folderServiceTreated = [];
    const paste = await this.checkPaste(
      `job/${id}/${typeService}/${year}/${month}`,
    );
    console.log("Pasta encontrada:", paste);
    console.log("Caminho da pasta:", `job/${id}/${typeService}/${year}/${month}`);

    // Mantém apenas entradas que são arquivos (valores começam com '/')
    const filterPaste = Object.fromEntries(
      Object.entries(paste).filter(
        ([key, value]) => value.startsWith('/') && key !== '0', // Adicione esta condição
      ),
    );
    console.log("Arquivos filtrados:", filterPaste);

    // Itera sobre cada arquivo usando CHAVE + VALOR
    for (const [fileId, filePath] of Object.entries(filterPaste)) {
      console.log("Processando arquivo:", {fileId, filePath});
      
      const servicesKey = `job/${id}/${typeService}/${year}/${month}${filePath}`;
      console.log("Chave do serviço:", servicesKey);
      
      const servicesFile = await this.getFileFromBucket(servicesKey);
      console.log("Arquivo encontrado:", servicesFile);

      if (!servicesFile) {
        console.log("Arquivo não encontrado:", filePath);
        folderServiceTreated.push({
          status: 404,
          message: `Arquivo ${filePath} não encontrado`,
          service: typeService,
          fileName: filePath.split('/').pop(), // Pega apenas o nome do arquivo do caminho completo
        });
        continue;
      }

      // Processa PDF
      if (servicesFile.ContentType === 'application/pdf') {
        console.log("Processando PDF:", filePath);
        const url = await this.GenerateAccess(servicesKey);
        console.log("URL gerada:", url);
        
        folderServiceTreated.push({
          status: 200,
          type: 'pdf',
          path: servicesFile.base64Data,
          url: url,
          service: typeService,
          id: filePath.split('/').pop().split('_').pop(), // Pega o ID do arquivo que está após o último underscore
          fileName: filePath.split('/').pop(),
        });
      } else {
        console.log("Processando imagem:", filePath);
        // Processa Imagem
        folderServiceTreated.push({
          status: 200,
          type: 'picture',
          path: servicesFile.base64Data,
          service: typeService,
          fileName: filePath.split('/').pop(), // Pega apenas o nome do arquivo do caminho completo
        });
      }
    }

    console.log("Resultado final:", folderServiceTreated);

    if (folderServiceTreated.length === 0) {
      console.log("Nenhum arquivo encontrado");
      return {
        status: 404,
        message: 'Nenhum arquivo encontrado',
      };
    }

    return folderServiceTreated;
  }

  async uploadService(file: Express.Multer.File, id_work: any, typeService: any, year: any, month: any, name: string, buffer?: any) {
    const path = `job/${id_work}/${typeService}/${year}/${month}/${name}`;

    const mimeType =
      file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype;

    const jobFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: buffer ? buffer : file.buffer,
      ContentType: mimeType || 'application/pdf',
    };

    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(jobFile).promise();
      // console.log(s3Response);
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

  // Company

  async findCompanyDocument(cnpj: string, name: string) {
    switch (name.toLowerCase()) {
      case 'signature':
        const signatureKey = `company/${cnpj}/Signature/Signature`;
        const signatureFile = await this.getFileFromBucket(signatureKey);

        if (!signatureFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        return {
          status: 200,
          type:
            signatureFile.ContentType === 'application/pdf' ? 'pdf' : 'picture',
          path: signatureFile.base64Data,
        };
      case 'logo':
        const logoKey = `company/${cnpj}/Logo`;
        const logoFile = await this.getFileFromBucket(logoKey);

        if (!logoFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        return {
          status: 200,
          type: logoFile.ContentType === 'application/pdf' ? 'pdf' : 'picture',
          path: logoFile.base64Data,
        };
    }
  }

  async uploadCompany(
    file: Express.Multer.File,
    cnpj: string,
    document: string,
  ) {
    let path: string;
    switch (document.toLowerCase()) {
      case 'logo':
        path = `company/${cnpj}/Logo`;
        break;
      case 'signature':
        path = `company/${cnpj}/Signature/Signature`;
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    }

    const mimeType =
      file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype;
    const jobFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: mimeType,
    };

    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(jobFile).promise();

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

  async findCompanySingnature(cnpj: string) {
    const signatureKey = `company/${cnpj}/Signature/Signature`;
    const signatureFile = await this.getFileFromBucket(signatureKey);

    if (!signatureFile) {
      return {
        status: 404,
        message: 'Arquivo não encontrado',
      };
    }

    return {
      status: 200,
      type: signatureFile.ContentType === 'application/pdf' ? 'pdf' : 'picture',
      path: signatureFile.base64Data,
    };
  }
}
