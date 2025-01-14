import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpadteJobDto } from './dto/update.job.dto';

@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() uploadCollaboratorDto:UpadteJobDto) {
    return this.jobService.uploadFile(uploadCollaboratorDto,file)
  };

  @Post('document/signature')
  @UseInterceptors(FileInterceptor('file'))
  async generateDocumentAsignature(@UploadedFile() file: Express.Multer.File, @Body() uploadCollaboratorDto:UpadteJobDto) {
    return this.jobService.UploadJobFileSignature(uploadCollaboratorDto,file)
  };

  @Get('file/:id/:name/:signature/:dynamic')
  findFile(
    @Param('id') id: string,
    @Param('name') name: string,
    @Param('dynamic') dynamic: string,
    @Param('signature') signature: Boolean
  ){
    return this.jobService.findFile(+id, name, signature, dynamic);
  };

  @Get('admissional/check/:id')
  checkDocumentAdmissional(@Param('id') id: string) {
    return this.jobService.checkDocumentAdmissional(+id);
  };

  @Get()
  findAll() {
    return this.jobService.findAll();
  };

  @Get('collaborator/company/:cnpj')
  findCollaboratorCompany(@Param('cnpj') cnpj: string) {
    return this.jobService.findCollaboratorCompany(cnpj);
  };

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(id);
  };

  @Get('collaborator/aplicated/job/:cpf')
  findAllAplicatedInJob(@Param('cpf') cpf: string) {
    return this.jobService.findAllAplicatedInJob(cpf);
  };

  @Get('open/:cnpj')
  jobOpen(@Param('cnpj') cnpj: string) {
    return this.jobService.findJobOpen(cnpj);
  };

  @Get('process/admissional/:cnpj')
  jobProcessAdmissional(@Param('cnpj') cnpj: string) {
    return this.jobService.findProcessAdmissional(cnpj);
  };

  @Get('process/demissional/:cnpj')
  jobProcessDemissional(@Param('cnpj') cnpj: string) {
    return this.jobService.findProcessDemissional(cnpj);
  };

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(id, updateJobDto);
  };



  @Delete('document/dynamic/:name/:id')
  removeDocumentDynamic(@Param('name') name: string, @Param('id') id: string) {
    return this.jobService.removeDocumentDynamic(+id, name);
  };

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  };
}
