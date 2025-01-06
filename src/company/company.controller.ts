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

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
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

  
  @Get()
  findAll() {
    return this.companyService.findAll();
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(+id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(+id);
  }
}
