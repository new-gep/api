import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SignatureServiceDto } from './dto/signature-service.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.serviceService.create(createServiceDto);
  }

  @Post('document/signature')
  @UseInterceptors(FileInterceptor('file'))
  async generateDocumentAsignature(@UploadedFile() file: Express.Multer.File, @Body() signatureServiceDto:SignatureServiceDto) {
    return this.serviceService.UploadJobFileSignature(signatureServiceDto,file)
  };

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() updateServiceDto:UpdateServiceDto) {
    return this.serviceService.uploadFile(updateServiceDto,file)
  };

  @Get()
  findAll() {
    return this.serviceService.findAll();
  }

  @Get(':type/:cnpj/:month/:year')
  findAllByCnpjAndMonthAndYear(@Param('type') type: string, @Param('cnpj') cnpj: string, @Param('month') month: string, @Param('year') year: string) {
    return this.serviceService.FindAllByMonthAndYear(cnpj, month, year, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    console.log(updateServiceDto);
    return this.serviceService.update(+id, updateServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceService.remove(+id);
  }
}
