import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadServiceDto } from './dto/upload-service.dto';
import { RedisCacheDto } from './dto/cache-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    console.log(createCompanyDto);
    return this.companyService.create(createCompanyDto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCollaboratorDto: any,
  ) {
    return this.companyService.uploadCompanyDocument(uploadCollaboratorDto.cnpj, uploadCollaboratorDto.document, file);
  }

  @Post('service/upload')
  @UseInterceptors(FileInterceptor('file'))
  async departmentUpload(@UploadedFile() file: Express.Multer.File, @Body() upLoadServiceDto:UploadServiceDto) {
    return this.companyService.uploadFileService(upLoadServiceDto,file)
  };

  @Post('contract/upload')
  @UseInterceptors(FileInterceptor('file'))
  async contractUpload(@UploadedFile() file: Express.Multer.File, @Body() upLoadServiceDto:any) {
    return this.companyService.uploadFileContract(upLoadServiceDto.cnpj,file)
  };

  @Post('redis')
  async redisCache(@Body() redisCacheDto: RedisCacheDto) {
    return this.companyService.redisCache(redisCacheDto.action, redisCacheDto.key, redisCacheDto.value, redisCacheDto.ttl);
  }

  @Get()
  findAll() {
    return this.companyService.findAll();
  }

  @Get('contract/:cnpj/:plan')
  findCompanyContract(@Param('cnpj') cnpj: string, @Param('plan') plan: string) {
    return this.companyService.findCompanyContract(cnpj, plan);
  }

  @Get('document/:cnpj/:document')
  findCompanyDocument(
    @Param('cnpj') cnpj: string,
    @Param('document') document: string,
  ) {
    return this.companyService.findCompanyDocument(cnpj, document);
  }

  @Get(':cnpj')
  findOne(@Param('cnpj') cnpj: string) {
    return this.companyService.findOne(cnpj);
  }

  @Patch(':cnpj')
  update(@Param('cnpj') cnpj: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(cnpj, updateCompanyDto);
  }

  @Delete('file/:path')
  removeFile(@Param('path') path: string) {
    return this.companyService.removeFile(path);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(+id);
  }
}
