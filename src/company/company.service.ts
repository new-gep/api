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
import { fromPath } from 'pdf2pic';
import { createWorker, Worker } from 'tesseract.js';
import Poppler from 'node-poppler';
import ConvertImageToBase64 from 'hooks/covertImageToBase64';

@Injectable()
export class CompanyService {
  constructor(
    @Inject('COMPANY_REPOSITORY')
    private companyRepository: Repository<Company>,
    readonly userService: UserService,
    readonly bucketService: BucketService,
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
  };

  findAll() {
    return `This action returns all company`;
  };

  findCompanyDocument(cnpj: string, document:string) {
    return this.bucketService.findCompanyDocument(cnpj, document);
  };

  uploadCompanyDocument(cnpj: string, document:string, file: any) {
    return this.bucketService.uploadCompany(file, cnpj, document);
  };

  async uploadFileService(UploadServiceDto: UploadServiceDto, file: Express.Multer.File){

    switch(UploadServiceDto.type){
      case 'paystub':
        break;
      case 'point':
        break;
      default:

        return {
          status: 400,
          message: 'type not found',
        };
    };
    
    // const pdfPaths = await this.splitPdf(file.buffer);
    const base64String = file.buffer.toString('base64');
    const imagePaths = await this.convertPDFinImage(base64String);

    // Cria um worker do Tesseract para OCR
    const worker: Worker = await createWorker(); 
    await worker.load();
    // await worker.loadLanguage('por');    
    await worker.reinitialize('por');

    // Array para armazenar os CPFs encontrados
    let allCpfs: string[] = [];

    // 3. Para cada imagem, aplica OCR
    for (const imagePath of imagePaths) {
      // Executa OCR na imagem
      const { data } = await worker.recognize(imagePath);
      const text = data.text;
      // console.log(`Texto extraído de ${imagePath}: ${text}`);

      // Expressão regular para capturar CPF (formato 000.000.000-00)
      const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
      const defaultRegex = /\b\d{3}\.\d{5}\.\d{2}\.\d{1}\b/g;
      const match = text.match(defaultRegex);
      if (match && match.length > 0) {
        allCpfs.push(...match);
      }

    };

    await worker.terminate();
    console.log(allCpfs.length);
    return allCpfs;
  };

  async findOne(cnpj: string) {
    try {
      const logo = await this.bucketService.findCompanyDocument(cnpj, 'logo');
      const signature = await this.bucketService.findCompanyDocument(cnpj, 'signature');

      const response = await this.companyRepository.findOne({
        where: { CNPJ: cnpj },
      });

      if (response) {
        return {
          status: 200,
          company: response,
          logo:  logo.status == 404 ? null : logo.path,
          signature:signature.status == 404 ? null : signature.path, 
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
  };

  async update(CNPJ: string, updateCompanyDto: UpdateCompanyDto) {
    const time = FindTimeSP();
    updateCompanyDto.update_at = time;
    try{
      const response = await this.companyRepository.update(CNPJ,updateCompanyDto);
      if(response.affected === 1){
        return {
          status: 200,
          message:'Empresa atualizada com sucesso!'
        }
      }
      return {
        status:404,
        message:'Não foi possivel atualizar a empresa, algo deu errado!'
      }
    }catch(e){
      console.log(e)
      return {
        status :500,
        message:'Erro interno!'
      }
    }
  };

  async removeFile(path: string) {
    try{
      const response = await this.bucketService.deleteFile(path);
      if(response){
        return {
          status : 200,
          message: 'Arquivo deletado com sucesso',
        }
      }
  
      return {
        status : 404,
        message: 'Erro ao deletar o arquivo',
      }

    }catch(e){
      return {
        status : 500,
        message: 'Erro ao tentar deletar arquivo',
      }
    }

  };

  remove(id: number) {
    return `This action removes a #${id} company`;
  };

  private async splitPdf(fileBuffer: Buffer): Promise<string[]> {
    // Carrega o PDF
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = pdfDoc.getPageCount();
    const outputPaths: string[] = [];
    
    // Define um diretório temporário fixo (por exemplo, na raiz do projeto)
    const tempDir = path.join(process.cwd(), 'temp_pdf');
    
    // Cria o diretório se ele não existir
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }else {
      // Limpa o diretório: apaga todos os arquivos existentes
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
    }
    
    // Itera em cada página
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      const outputPath = path.join(tempDir, `page_${i + 1}.pdf`);
      fs.writeFileSync(outputPath, pdfBytes);
      outputPaths.push(outputPath);
    }
    return outputPaths;
  };


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
            singleFile: true
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

}
