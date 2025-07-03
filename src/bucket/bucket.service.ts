import { Injectable } from '@nestjs/common';
import { removeBackground } from '@imgly/background-removal-node';
import * as AWS from 'aws-sdk';
import Mask from 'hooks/mask';
import Poppler from 'node-poppler';
import ConvertImageToBase64 from 'hooks/covertImageToBase64';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as sharp from 'sharp';
import { compress } from 'compress-pdf';
import { exec, execSync } from 'child_process';
import { cwd } from 'process';
import { promisify } from 'util';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
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

  async replaceAllPage(
    pdfBase64: string,
    pagesPicture: any[],
  ): Promise<Buffer> {
    // Remove o prefixo 'data:application/pdf;base64,' se presente
    pdfBase64 = pdfBase64.replace('data:application/pdf;base64,', '');

    // Converte a string base64 em bytes
    const pdfBytes = Buffer.from(pdfBase64, 'base64');

    // Carrega o documento PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Remove todas as páginas existentes
    const numPages = pdfDoc.getPageCount();
    for (let i = numPages - 1; i >= 0; i--) {
      pdfDoc.removePage(i);
    }

    // Itera sobre o array de imagens e adiciona cada uma como uma nova página
    for (const page of pagesPicture) {
      // Verifica se a imagem existe e tem a propriedade base64
      if (!page?.base64) {
        console.warn('Imagem inválida encontrada em pagesPicture:', page);
        continue;
      }

      // Remove o prefixo 'data:image/png;base64,' se presente
      const imageBase64 = page.base64.replace(
        /^data:image\/[a-z]+;base64,/,
        '',
      );

      // Converte a imagem base64 em bytes
      const imageBytes = Buffer.from(imageBase64, 'base64');

      // const optimizedImageBytes = await sharp(imageBytes)
      // .resize({ width: 800 }) // ou ajuste conforme necessário
      // .png({ quality: 50 })   // compacta mantendo boa qualidade
      // .toBuffer();

      // Embutir a imagem no PDF (assumindo que é PNG, ajuste se necessário)
      const image = await pdfDoc.embedPng(imageBytes);

      // Adiciona uma nova página
      const newPage = pdfDoc.addPage();

      // Obtém as dimensões da página e da imagem
      const pageWidth = newPage.getWidth();
      const pageHeight = newPage.getHeight();
      const imageWidth = image.width;
      const imageHeight = image.height;

      // Calcula a escala para ajustar a imagem à página, mantendo a proporção
      let scale = 1;
      if (imageWidth > pageWidth || imageHeight > pageHeight) {
        scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
      }

      // Aplica a escala à imagem
      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeight * scale;

      // Desenha a imagem no centro da página
      newPage.drawImage(image, {
        x: (pageWidth - scaledWidth) / 2,
        y: (pageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    // Salva o PDF modificado
    const pdfModificado = await pdfDoc.save();

    // Retorna o Buffer do PDF modificado
    return Buffer.from(pdfModificado);
  }

  async clearTempFolder() {
    try {
      const tempPath = './temp';
      const files = await readdir(tempPath);

      if (files.length === 0) {
        console.log('A pasta temp já está vazia.');
        return;
      }

      const deletions = files.map((file) => unlink(join(tempPath, file)));
      await Promise.all(deletions);

      console.log(
        'Todos os arquivos da pasta temp foram apagados com sucesso.',
      );
    } catch (error) {
      console.error('Erro ao limpar a pasta temp:', error);
    }
  }

  async waitForFile(filePath: string, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const intervalTime = 100;
      let elapsed = 0;

      const interval = setInterval(() => {
        if (fs.existsSync(filePath)) {
          clearInterval(interval);
          resolve();
        } else {
          elapsed += intervalTime;
          if (elapsed >= timeout) {
            clearInterval(interval);
            reject(new Error(`Arquivo ${filePath} não apareceu a tempo`));
          }
        }
      }, intervalTime);
    });
  }

  async convertPDFinImage(base64: string) {
    const poppler = new Poppler();

    return new Promise(async (resolve, reject) => {
      // Criar subpasta temporária exclusiva
      const tempRoot = path.join(__dirname, '../../temp'); // ou onde está sua pasta temp
      const uniqueFolder = path.join(tempRoot, `session-${Date.now()}`);
      await fs.promises.mkdir(uniqueFolder, { recursive: true });

      try {
        base64 = base64.replace('data:application/pdf;base64,', '');
        const buffer = Buffer.from(base64, 'base64');

        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();

        const options = {
          firstPageToConvert: 1,
          lastPageToConvert: pages.length,
          pngFile: true,
        };

        await poppler.pdfToCairo(
          buffer,
          path.join(uniqueFolder, 'page'),
          options,
        );

        const results = [];

        for (let i = 1; i <= pages.length; i++) {
          let imagePath = path.join(uniqueFolder, `page-${i}.png`);
          if (!fs.existsSync(imagePath)) {
            const padded = String(i).padStart(2, '0');
            imagePath = path.join(uniqueFolder, `page-${padded}.png`);
          }

          // Aguarda até que o arquivo exista (máx. 5s)
          await this.waitForFile(imagePath, 5000);

          const base64Image = await ConvertImageToBase64(imagePath);
          results.push({
            page: i,
            base64: `data:image/png;base64,${base64Image}`,
            change: false,
          });
        }

        // Remove a pasta toda (recursivo e forçado)
        await fs.promises.rm(uniqueFolder, { recursive: true, force: true });

        resolve(results);
      } catch (error) {
        await fs.promises.rm(uniqueFolder, { recursive: true, force: true });
        console.error('Erro ao converter PDF para imagem:', error);
        reject(error);
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
      // Lista os objetos no bucket
      const data = await this.bucket
        .listObjectsV2({
          Bucket: bucketName,
          Prefix: folderPath, // Prefixo para listar arquivos dentro da pasta
        })
        .promise();

      // Se os arquivos existirem, processa os nomes
      if (data.Contents) {
        let index = 0; // Inicializa o índice
        data.Contents.forEach((item) => {
          if (item.Key) {
            // Extrai o nome do arquivo removendo o caminho completo
            const fileName = item.Key.replace(folderPath, '');

            if (fileName) {
              result[index] = fileName;
              // console.log(`Adicionando ao resultado - índice ${index}:`, fileName);
              index++;
            }
          }
        });
      }

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
        case 'cv':
          path = `collaborator/${cpf}/CV`;
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
        case 'signature':
          path = `collaborator/${cpf}/Signature`;
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

          case 'cv':
            const cvKey = `collaborator/${cpf}/CV`;
            const cvFile = await this.getFileFromBucket(cvKey);
            return {
              status: 200,
              type: 'pdf',
              path: cvFile.base64Data,
            };
            break;

          case 'signature':
            const SignatureKey = `collaborator/${cpf}/Signature`;
            const SignatureFile = await this.getFileFromBucket(SignatureKey);
            return {
              status: 200,
              type: 'picture',
              path: SignatureFile.base64Data, // arquivo base64 de endereço
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
          const [d, m, y] = child.birth.split('/'); // "DD/MM/YYYY"
          const birthDate = new Date(`${y}-${m}-${d}`);
          const today = new Date();

          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();

          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--; // ainda não fez aniversário esse ano
          }

          if (age > 14) {
            continue;
          }
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
      case 'dismissal_communication_signature':
        path = `job/${id}/Dismissal/Signature/Communication/Collaborator`;
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
    name: string,
    id: number,
    dynamic?: string,
    pages?: any,
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
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        } else {
          console.log(`Origin Não encontrado: ${pathOrigin}`);
          return {
            status: 400,
            message: `Origin Não encontrado: ${pathOrigin}`,
          };
        }

        break;
      case 'experience_contract':
        pathOrigin = `job/${id}/Admission/Experience_Contract`;
        path = `job/${id}/Admission/Complet/Experience_Contract`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'hours_extension':
        pathOrigin = `job/${id}/Admission/Hours_Extension`;
        path = `job/${id}/Admission/Complet/Hours_Extension`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'hours_compensation':
        pathOrigin = `job/${id}/Admission/Hours_Compensation`;
        path = `job/${id}/Admission/Complet/Hours_Compensation`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'transport_voucher':
        pathOrigin = `job/${id}/Admission/Transport_Voucher`;
        path = `job/${id}/Admission/Complet/Transport_Voucher`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'dynamic':
        pathOrigin = `job/${id}/Admission/Dynamic/${dynamic}`;
        path = `job/${id}/Admission/Complet/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'dismissal_dynamic':
        pathOrigin = `job/${id}/Dismissal/Dynamic/${dynamic}`;
        path = `job/${id}/Dismissal/Complet/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      case 'dismissal_communication_dynamic':
        pathOrigin = `job/${id}/Dismissal/Dynamic/Communication/${dynamic}`;
        path = `job/${id}/Dismissal/Complet/Communication/${dynamic}`;
        response = await this.getFileFromBucket(pathOrigin);
        if (response && response.ContentType.includes('pdf')) {
          newPDF = await this.replaceAllPage(response.base64Data, pages);
          newPDF = await this.compressPdf(newPDF);
        }
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${name}`,
        };
    }
    const mimeType = 'application/pdf';
    const fileSignature = {
      Bucket: this.bucketName,
      Key: path,
      Body: newPDF,
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
      console.log(error);
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
        const medicalDismissalKey = `job/${id}/Dismissal/Medical_Examination`;
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
          // console.log('signature', signature);
          const dynamicSignatureKey = `job/${id}/Dismissal/Signature/Communication/Collaborator`;
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

    // Mantém apenas entradas que são arquivos (valores começam com '/')
    const filterPaste = Object.fromEntries(
      Object.entries(paste).filter(
        ([key, value]) => value.startsWith('/') && key, // Adicione esta condição
      ),
    );
    // Itera sobre cada arquivo usando CHAVE + VALOR
    for (const [fileId, filePath] of Object.entries(filterPaste)) {
      const servicesKey = `job/${id}/${typeService}/${year}/${month}${filePath}`;

      const servicesFile = await this.getFileFromBucket(servicesKey);

      if (!servicesFile) {
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
        const url = await this.GenerateAccess(servicesKey);

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

    if (folderServiceTreated.length === 0) {
      return {
        status: 404,
        message: 'Nenhum arquivo encontrado',
      };
    }

    return folderServiceTreated;
  }

  async findOneService(
    id_work: any,
    typeService: any,
    year: any,
    month: any,
    name: string,
  ) {
    const path = `job/${id_work}/${typeService}/${year}/${month}/${name}`;
    const serviceFile = await this.getFileFromBucket(path);

    if (!serviceFile) {
      return {
        status: 404,
        message: 'File not found',
      };
    }
    if (serviceFile.ContentType === 'application/pdf') {
      const imageBase64 = await this.convertPDFinImage(serviceFile.base64Data);

      return {
        status: 200,
        type: serviceFile.ContentType === 'application/pdf' ? 'pdf' : 'picture',
        path: serviceFile.base64Data,
        picture: imageBase64,
      };
    }

    return {
      status: 200,
      type: serviceFile.ContentType === 'application/pdf' ? 'pdf' : 'picture',
      path: serviceFile.base64Data,
    };
  }

  async uploadService(
    file: Express.Multer.File,
    id_work: any,
    typeService: any,
    year: any,
    month: any,
    name: string,
    buffer?: any,
  ) {
    const path = `job/${id_work}/${typeService}/${year}/${month}/${name}`;
    // console.log("path", path);

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

  async uploadServiceFileSignature(
    file: Express.Multer.File,
    name: string,
    type: string,
    id_work: any,
  ) {
    let pathOrigin: string;
    let path: string;
    let response: any;
    let newPDF: any;

    const [action, type_service, year_file, month_file, id_service] =
      name.split('_');
    const newName = name.replace(/^[^_]+/, 'Full');

    pathOrigin = `job/${id_work}/${type}/${year_file}/${month_file}/${name}`;
    path = `job/${id_work}/${type}/${year_file}/${month_file}/${newName}`;

    response = await this.getFileFromBucket(pathOrigin);
    if (response && response.ContentType.includes('pdf')) {
      //@ts-ignore
      newPDF = await this.replaceLastPage(response.base64Data, file);
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

      const fileSignatureFull = await this.getFileFromBucket(s3Response.Key);

      if (!fileSignatureFull) {
        return {
          status: 404,
          message: 'Arquivo não encontrado',
        };
      }

      if (fileSignatureFull?.ContentType === 'application/pdf') {
        return {
          status: 200,
          message: 'Upload realizado com sucesso',
          type: 'pdf',
          path: fileSignatureFull.base64Data, // Retorna o PDF completo em base64
        };
      }

      return {
        status: 200,
        message: 'Upload realizado com sucesso',
        type: 'picture',
        path: fileSignatureFull.base64Data, // arquivo base64 de endereço
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
      case 'contractactive':
        const contractActiveKey = `company/${cnpj}/Contract/active`;
        const contractActiveFile =
          await this.getFileFromBucket(contractActiveKey);

        if (!contractActiveFile) {
          return {
            status: 404,
            message: 'Arquivo não encontrado',
          };
        }

        return {
          status: 200,
          type:
            contractActiveFile.ContentType === 'application/pdf'
              ? 'pdf'
              : 'picture',
          path: contractActiveFile.base64Data,
        };
      default:
        return {
          status: 400,
          message: `Type document not supported: ${name}`,
        };
    }
  }

  async findCompanyContract(cnpj: string, plan: string) {
    let contractKey;
    let contractFile;

    switch (plan.toLowerCase()) {
      case '1':
        contractKey = `newgep/Contract/Contrat_1`;
        contractFile = await this.getFileFromBucket(contractKey);
        break;
      case '2':
        contractKey = `newgep/Contract/Contrat_2`;
        contractFile = await this.getFileFromBucket(contractKey);
        break;
      case '3':
        contractKey = `newgep/Contract/Contrat_3`;
        contractFile = await this.getFileFromBucket(contractKey);
        break;
      default:
        return {
          status: 400,
          message: `Type document not supported: ${plan}`,
        };
    }

    if (!contractFile) {
      return {
        status: 404,
        message: 'File not found',
      };
    }

    if (contractFile?.ContentType === 'application/pdf') {
      const imageBase64 = await this.convertPDFinImage(contractFile.base64Data);
      return {
        status: 200,
        type: 'pdf',
        path: contractFile.base64Data,
        picture: imageBase64,
      };
    }

    return {
      status: 200,
      type: 'picture',
      path: contractFile.base64Data,
    };
  }

  async uploadCompany(
    file: Express.Multer.File,
    cnpj: string,
    document: string,
  ) {
    let s3Path: string; // Renomeado para evitar conflito com o módulo 'path'
    let fileBuffer = file.buffer; // Buffer original do arquivo

    switch (document.toLowerCase()) {
      case 'logo':
        s3Path = `company/${cnpj}/Logo`;
        break;
      case 'signature':
        s3Path = `company/${cnpj}/Signature/Signature`;

        // Verifica se o arquivo é PNG e se o buffer não está vazio
        // if (file.mimetype !== 'image/png') {
        //   return {
        //     status: 400,
        //     message: 'Apenas arquivos PNG são suportados para remoção de fundo',
        //   };
        // }

        if (!file.buffer || file.buffer.length === 0) {
          return {
            status: 400,
            message: 'O arquivo PNG está vazio ou corrompido',
          };
        }

        try {
          // Cria arquivos temporários para entrada e saída
          const tempDir = os.tmpdir();
          const inputPath = path.join(tempDir, `input-${Date.now()}.png`);
          const outputPath = path.join(tempDir, `output-${Date.now()}.png`);

          // Salva o buffer de entrada temporariamente
          fs.writeFileSync(inputPath, file.buffer);

          // Executa o script Python do Rembg
          execSync(`python remove_bg.py ${inputPath} ${outputPath}`),
            {
              stdio: 'inherit',
            };

          // Lê o arquivo de saída (imagem sem fundo)
          fileBuffer = fs.readFileSync(outputPath);

          // Remove arquivos temporários
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch (error) {
          console.error('Erro ao remover fundo:', error);
          return {
            status: 500,
            message: 'Erro ao remover fundo da imagem PNG',
            error: error.message,
          };
        }
        break;
      case 'contract':
        s3Path = `company/${cnpj}/Contract/active`;
        break;
      default:
        return {
          status: 400,
          message: `Tipo de documento não suportado: ${document}`,
        };
    }

    const mimeType =
      document.toLowerCase() === 'signature'
        ? 'image/png' // Imagens sem fundo são retornadas como PNG
        : file.mimetype === 'image/pdf'
          ? 'application/pdf'
          : file.mimetype;

    const jobFile = {
      Bucket: this.bucketName,
      Key: s3Path, // Usa s3Path em vez de path
      Body: fileBuffer, // Usa o buffer processado (sem fundo para signature) ou original
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
      console.error('Erro no upload para S3:', error);
      return {
        status: 500,
        message: 'Erro no upload do arquivo',
        error: error.message,
      };
    }
  }

  async uploadContractCompany(file: Express.Multer.File, cnpj: string) {
    let pathOrigin: string;
    let path: string;
    let response: any;
    let newPDF: any;

    pathOrigin = `newgep/Contract/Contrat_1`;
    path = `company/${cnpj}/Contract/active`;

    response = await this.getFileFromBucket(pathOrigin);
    if (response && response.ContentType.includes('pdf')) {
      //@ts-ignore
      newPDF = await this.replaceLastPage(response.base64Data, file);
    }

    const mimeType =
      response && response.ContentType.includes('pdf')
        ? 'application/pdf'
        : file.mimetype;

    const jobFile = {
      Bucket: this.bucketName,
      Key: path,
      Body:
        response && response.ContentType.includes('pdf') ? newPDF : file.buffer,
      ContentType: mimeType,
    };

    try {
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

  // collaborator

  async findSignature(cpf: string) {}

  async findDossieCollaborator(cpf: string, id_work: number) {
    const admission = `job/${id_work}/Admission/Complet`;
    const dismissal_communication = `job/${id_work}/Dismissal/Complet/Communication`;
    const dismissal = `job/${id_work}/Dismissal/Complet`;
    const document = `collaborator/${cpf}`;

    const documentFiles = await this.findFileCollaborator(cpf);
    const dismissalFiles = await this.listarArquivosComConteudo(dismissal);
    const admissionFiles = await this.listarArquivosComConteudo(admission);

    return {
      status: 200,
      document: documentFiles,
      dismissal: dismissalFiles,
      admissionFiles: admissionFiles,
    };
  }

  async findFileCollaborator(cpf: string) {
    const prefix = `collaborator/${cpf}/`;
    const arquivosBase64 = [];

    const lista = await this.bucket
      .listObjectsV2({ Bucket: this.bucketName, Prefix: prefix })
      .promise();

    const arquivos = lista.Contents || [];

    for (const obj of arquivos) {
      const key = obj.Key;
      if (!key) continue;

      // Pegamos apenas os arquivos que terminam com nomes desejados
      const match = key.match(
        /\/(School_History|Military_Certificate|Marriage_Certificate|Address|complet|front|back|)(\.(pdf|jpg|jpeg|png))?$/i,
      );

      if (match) {
        const parts = key.split('/');
        const tipoDocumento = parts[2]; // CNH, RG, etc

        const arquivo = await this.getFileFromBucket(key);
        if (arquivo) {
          arquivosBase64.push({
            key,
            document: tipoDocumento,
            type: match[1], // complet, front, back
            base64: arquivo.base64Data,
            contentType: arquivo.ContentType.includes('application/pdf')
              ? 'pdf'
              : 'picture',
            status: 'approved',
          });
        }
      }
    }

    const childrens = await this.getAllFilesChildrenFromBucket(cpf);
    // console.log('children',childrens);

    return {
      files: arquivosBase64,
      childrens: childrens,
    };
  }

  async listarArquivosComConteudo(prefix: any) {
    let arquivos = [];
    let continuationToken;

    try {
      do {
        // Parâmetros para listar os objetos no bucket
        const params = {
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        };

        const data = await this.bucket.listObjectsV2(params).promise();

        // Para cada objeto listado, pegar os dados e converter para base64
        for (let obj of data.Contents) {
          const fileData = await this.getFileFromBucket(obj.Key);
          // const fileData = await this.bucket
          //   .getObject({
          //     Bucket: this.bucketName,
          //     Key: obj.Key,
          //   })
          //   .promise();

          // Nome do documento pode ser extraído do Key
          const nameDocument = obj.Key.split('/').pop();

          // Adiciona os dados na lista de arquivos
          arquivos.push({
            key: obj.Key,
            document: nameDocument,
            base64: fileData.base64Data,
            twoPicture: 'complet',
            contentType: fileData.ContentType.includes('application/pdf')
              ? 'pdf'
              : 'picture',
            status: 'approved',
          });
        }

        // Continuar listando se houver mais objetos
        continuationToken = data.IsTruncated
          ? data.NextContinuationToken
          : null;
      } while (continuationToken);

      return arquivos;
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      throw error;
    }
  }

  async compressPdf(inputBuffer: Buffer): Promise<Buffer> {
    try {
      // Comprime o PDF diretamente com o buffer
      const compressedBuffer = await compress(inputBuffer);

      return compressedBuffer;
    } catch (error) {
      console.error('Erro ao comprimir o PDF:', error);
      return inputBuffer; // Retorna o buffer original em caso de erro
    }
  }

  // Announcement

  async uploadAnnouncement(file: Express.Multer.File, id: any) {
    const name = Date.now();
    const path = `announcement/${id}/${name}`;

    const mimeType =
      file.mimetype === 'image/pdf' ? 'application/pdf' : file.mimetype;
    const AnnouncementFile = {
      Bucket: this.bucketName,
      Key: path,
      Body: file.buffer,
      ContentType: mimeType || 'application/pdf',
    };

    try {
      // Fazendo o upload para o bucket (exemplo com AWS S3)
      const s3Response = await this.bucket.upload(AnnouncementFile).promise();
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

  async updateUploadAnnouncement(newKeys: any, id: any) {
    const oldKeys = await this.findAnnouncement(id);
  }

  async findAnnouncement(id: any) {
    const prefix = `announcement/${id}/`;
    const filesBase64 = [];
    const list = await this.bucket
      .listObjectsV2({ Bucket: this.bucketName, Prefix: prefix })
      .promise();
    if (list.Contents) {
      for (const obj of list.Contents) {
        const key = obj.Key;
        if (!key) continue;
        const file = await this.getFileFromBucket(key);
        filesBase64.push({ base64: file.base64Data, key: key });
      }
    }
    return filesBase64;
  }
}
