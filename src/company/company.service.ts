import { Inject, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import FindTimeSP from 'hooks/time';
import { BucketService } from 'src/bucket/bucket.service';
import { UploadServiceDto } from './dto/upload-service.dto';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { createWorker, Worker } from 'tesseract.js';
import Poppler from 'node-poppler';
import { RedisService } from 'src/redis/redis.service';
import { CollaboratorService } from 'src/collaborator/collaborator.service';
import ConvertImageToBase64 from 'hooks/covertImageToBase64';
import ConvertBase64ToPDF from 'hooks/convertBase64ToPDF';
import { ServiceService } from 'src/service/service.service';
import { EmailService } from 'src/email/email.service';
import { Buffer as NodeBuffer } from 'buffer';
@Injectable()
export class CompanyService {
  constructor(
    @Inject('COMPANY_REPOSITORY')
    private companyRepository: Repository<Company>,
    readonly userService: UserService,
    readonly bucketService: BucketService,
    readonly redisService: RedisService,
    readonly collaboratorService: CollaboratorService,
    readonly serviceService: ServiceService,
    readonly emailService: EmailService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const existingCNPJCompany = await this.companyRepository.findOne({
        where: { CNPJ: createCompanyDto.CNPJ },
      });

      if (existingCNPJCompany) {
        return {
          status: 409,
          message: 'CNPJ já cadastrado.',
        };
      }

      const ParamsNewUser = {
        user: createCompanyDto.user,
        name: createCompanyDto.responsible,
        password: createCompanyDto.password,
        email: createCompanyDto.email,
        phone: createCompanyDto.phone,
        hierarchy: '0',
        CNPJ_company: createCompanyDto.CNPJ,
      };

      const checkUp = await this.userService.singUp(ParamsNewUser);

      if (checkUp) {
        return checkUp;
      }

      const time = await FindTimeSP();
      createCompanyDto.create_at = time;

      await this.companyRepository.save(createCompanyDto);
      const user = await this.userService.create(ParamsNewUser);

      return {
        status: 201,
        message: 'Conta e usário criados.',
        token: user.token,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno tente mais tarde',
      };
    }
    // this.userService.create()
  }

  async redisCache(action: string, key: string, value?: any, ttl?: number) {
    let response;
    try {
      switch (action) {
        case 'set':
          response = await this.redisService.set(key, value, ttl);
          break;
        case 'get':
          response = await this.redisService.get(key);
          break;
        case 'delete':
          response = await this.redisService.delete(key);
          break;
        default:
          return 'action not found';
      }
      return response;
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Error in redis cache',
      };
    }
  }

  findAll() {
    return `This action returns all company`;
  }

  findCompanyDocument(cnpj: string, document: string) {
    return this.bucketService.findCompanyDocument(cnpj, document);
  }

  uploadCompanyDocument(cnpj: string, document: string, file: any) {
    return this.bucketService.uploadCompany(file, cnpj, document);
  }

  async uploadFileService(
    UploadServiceDto: UploadServiceDto,
    file: Express.Multer.File,
  ) {
    try {
      await this.redisCache(
        'set',
        `Company_${UploadServiceDto.cnpj}_Import_Service`,
        UploadServiceDto,
        5000,
      );

      switch (UploadServiceDto.type) {
        case 'paystub':
          break;
        case 'point':
          break;
        default:
          return {
            status: 400,
            message: 'type not found',
          };
      }

      // const pdfPaths = await this.splitPdf(file.buffer);
      const base64String = file.buffer.toString('base64');
      const imagePaths = await this.convertPDFinImage(base64String);

      // Cria um worker do Tesseract para OCR
      const worker: Worker = await createWorker();
      await worker.load();
      // await worker.loadLanguage('por');
      await worker.reinitialize('por');

      // Array para armazenar os CPFs encontrados com suas imagens
      let allCpfs: { cpf: string; image: string }[] = [];

      // 3. Para cada imagem, aplica OCR
      for (const imagePath of imagePaths) {
        // Executa OCR na imagem
        const { data } = await worker.recognize(imagePath);
        const text = data.text;
        // console.log(`Texto extraído de ${imagePath}: ${text}`);

        // Expressão regular para capturar CPF (formato 000.000.000-00)
        const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
        // const defaultRegex = /\b\d{3}\.\d{5}\.\d{2}\.\d{1}\b/g;
        const match = text.match(cpfRegex);
        if (match && match.length > 0) {
          match.forEach((cpf) => {
            allCpfs.push({ cpf, image: imagePath });
          });
        }
      }
      await worker.terminate();
      
      const report = await this.createReportService(
        allCpfs,
        UploadServiceDto.month,
        UploadServiceDto.year,
        UploadServiceDto.type,
      );

      console.log(report)

      if(report.status === 200){
        const user = await this.userService.findOne(UploadServiceDto.user);
        console.log(user)
        if(user.status === 200){
          await this.emailService.sendReportEmail(user.user.email, report.buffer);
        }
      }

      // console.log(allCpfs)
      
      await this.redisCache(
        'delete',
        `Company_${UploadServiceDto.cnpj}_Import_Service`,
      );
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro ao processar o arquivo',
      };
    }
  }

  async findOne(cnpj: string) {
    try {
      const logo = await this.bucketService.findCompanyDocument(cnpj, 'logo');
      const signature = await this.bucketService.findCompanyDocument(
        cnpj,
        'signature',
      );

      const response = await this.companyRepository.findOne({
        where: { CNPJ: cnpj },
      });

      if (response) {
        return {
          status: 200,
          company: response,
          logo: logo.status == 404 ? null : logo.path,
          signature: signature.status == 404 ? null : signature.path,
        };
      }
      return {
        status: 409,
        message: 'Registro não encontrado',
      };
    } catch (error) {
      console.log(error);
      return {
        status: 500,
        message: 'Erro no servidor',
      };
    }
  }

  async update(CNPJ: string, updateCompanyDto: UpdateCompanyDto) {
    const time = FindTimeSP();
    updateCompanyDto.update_at = time;
    try {
      const response = await this.companyRepository.update(
        CNPJ,
        updateCompanyDto,
      );
      if (response.affected === 1) {
        return {
          status: 200,
          message: 'Empresa atualizada com sucesso!',
        };
      }
      return {
        status: 404,
        message: 'Não foi possivel atualizar a empresa, algo deu errado!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'Erro interno!',
      };
    }
  }

  async removeFile(path: string) {
    try {
      const response = await this.bucketService.deleteFile(path);
      if (response) {
        return {
          status: 200,
          message: 'Arquivo deletado com sucesso',
        };
      }

      return {
        status: 404,
        message: 'Erro ao deletar o arquivo',
      };
    } catch (e) {
      return {
        status: 500,
        message: 'Erro ao tentar deletar arquivo',
      };
    }
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }

  private async convertPDFinImage(base64: string): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const outputDir = './temp_service';

        // Se a pasta não existir, cria-a
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        } else {
          // Se existir, esvazia a pasta removendo todos os arquivos
          const files = fs.readdirSync(outputDir);
          for (const file of files) {
            fs.unlinkSync(path.join(outputDir, file));
          }
        }

        // Remove o prefixo data:... se existir
        base64 = base64.replace('data:application/pdf;base64,', '');
        const buffer = Buffer.from(base64, 'base64');
        const poppler = new Poppler();
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();

        const options = {
          lastPageToConvert: pages.length,
          pngFile: true,
          resolutionXAxis: 300,
          resolutionYAxis: 300,
        };
        const imagePaths: string[] = [];

        // Para cada página, converte e grava a imagem na pasta de saída
        for (let i = 0; i < pages.length; i++) {
          const outputPath = path.join(outputDir, `service-${i}`);
          await poppler.pdfToCairo(buffer, outputPath, {
            ...options,
            firstPageToConvert: i + 1,
            lastPageToConvert: i + 1,
            singleFile: true,
          });
          imagePaths.push(`${outputPath}.png`);
        }

        resolve(imagePaths);
      } catch (error) {
        console.error('Erro ao converter PDF para imagem:', error);
        reject(error);
      }
    });
  }

  private async createReportService(
    allCpfs: { cpf: string; image: string }[],
    month: string,
    year: string,
    type: string,
  ) {
    const uniqueCpfsByImage = new Map();
   
    // Remove os CPFs duplicados baseado na imagem
    allCpfs.forEach(({ cpf, image }) => {
      const key = `${cpf}-${image}`;
      if (!uniqueCpfsByImage.has(key)) {
        uniqueCpfsByImage.set(key, { cpf, image });
      }
    });

    // Adiciona os CPFs únicos a um array
    const uniqueCpfs = Array.from(uniqueCpfsByImage.values());

    const report = await Promise.all(
      // Para cada CPF, cria um novo serviço, faz o upload do arquivo para o bucket e atualiza o nome do serviço
      uniqueCpfs.map(async ({ cpf, image }) => {
        // Remove as máscaras do CPF
        const cpfWithoutMask = cpf.replace(/\./g, '').replace(/-/g, '');
        
        // Busca o colaborador
        const response = await this.collaboratorService.findOne(cpfWithoutMask);

        // Verifica se o colaborador foi encontrado
        if (response && response.status === 200 ) {

          // Verifica se o colaborador possui um trabalho vinculado
          if(!response.collaborator.id_work){
            return {
              cpf: cpfWithoutMask,
              image,
              status: 'Atualmente não possui um trabalho vinculo',
            };
          }

          // Cria um novo serviço
          const newService = await this.serviceService.create({
            name: 'Service',
            type: type,
            status: 'Pending',
            id_work: parseInt(response.collaborator.id_work),
          });

          // Verifica se o serviço foi criado com sucesso
          if(newService.status !== 201){
            return {
              cpf: cpfWithoutMask,
              image,
              status: 'Erro ao criar o serviço, tente novamente mais tarde',
            };
          }

          // Atualiza o nome do serviço
          const fileName = `Service_${type == 'paystub' ? 'PayStub' : 'Point'}_${year}_${month}_${newService.service.id}`;
          await this.serviceService.update(parseInt(newService.service.id), {
            name: fileName,
          });

          // Converte a imagem para base64
          const base64Image = ConvertImageToBase64(image);

          // Converte a imagem para PDF
          const pdfBuffer = await ConvertBase64ToPDF(base64Image);

          // Faz o upload do arquivo para o bucket
          //@ts-ignore
          await this.bucketService.uploadService(pdfBuffer, response.collaborator.id_work, type == 'paystub' ? 'PayStub' : 'Point', year, month, fileName, pdfBuffer);

          return {
            cpf: cpfWithoutMask,
            image,
            status: 'Sucesso',
            data: response.collaborator,
          };
        } else {
          // console.log('Colaborador não encontrado:', cpf);
          return { cpf: cpfWithoutMask, image, status: 'Colaborador não encontrado' };
        }
      }),
    );

    return this.createFileReport(report);
  }

  private async createFileReport(report: any) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Relatório de Serviços');

    // Adiciona cabeçalhos
    worksheet.columns = [
      { header: 'CPF', key: 'cpf', width: 20 },
      { header: 'Status', key: 'status', width: 30 },
      { header: 'Nome', key: 'nome', width: 30 },
    ];

    // Adiciona dados ao relatório
    report.forEach((item: any) => {
      worksheet.addRow({
        status: item.status,
        cpf: item.cpf,
        nome: item.data ? item.data.name : 'N/A',
      });
    });

    // Gera o buffer do arquivo
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const nodeBuffer = NodeBuffer.from(excelBuffer);

    return {
        status: 200,
        message: 'report created successfully',
        buffer: nodeBuffer,
      };
    } catch (e) {
      console.log(e);
      return {
        status: 500,
        message: 'report error',
      };
    }
  }

}
