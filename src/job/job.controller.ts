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

  @Post('service/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileSignature(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      year: string,
      month: string,
      id_work: string,
      type: string,
      name: string,
      CPF_collaborator: string
    }
  ) {
    console.log("body", body)
    return this.jobService.UploadJobFileAbsence({
      year: body.year,
      month: body.month, 
      id_work: body.id_work,
      type: body.type,
      name: body.name,
      //@ts-ignore
      CPF_collaborator: body.cpf
    }, file);
  };

  @Post('document/signature')
  @UseInterceptors(FileInterceptor('file'))
  async generateDocumentAsignature(@UploadedFile() file: Express.Multer.File, @Body() uploadCollaboratorDto:UpadteJobDto) {
    return this.jobService.UploadJobFileSignature(uploadCollaboratorDto,file)
  };

  @Get('file/:id/:name/:signature/:dynamic/')
  findFile(
    @Param('id') id: string,
    @Param('name') name: string,
    @Param('dynamic') dynamic: string,
    @Param('signature') signature: Boolean,
  ){
    return this.jobService.findFile(+id, name, signature, dynamic);
  };

  @Get('admissional/check/:id')
  checkDocumentAdmissional(@Param('id') id: string) {
    return this.jobService.checkDocumentAdmissional(+id);
  };

  @Get('dismissal/check/:id')
  checkDocumentDismissal(@Param('id') id: string) {
    return this.jobService.checkDocumentDismissal(+id);
  };

  @Get('all/:cpf')
  findAllJobsCollaborator(@Param('cpf') cpf: string)
  {
    return this.jobService.findAllJobsCollaborator(cpf);
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

  @Get('fileService/:id/:typeService/:year/:month')
  jobServices(@Param('id') id: any,
   @Param('typeService') typeService: any,
    @Param('year') year: any,
     @Param('month') month: any) {
    
    return this.jobService.jobServices(id, typeService, year, month);
  };



  @Get('process/demissional/:cnpj')
  jobProcessDemissional(@Param('cnpj') cnpj: string) {
    return this.jobService.findProcessDemissional(cnpj);
  };

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(id, updateJobDto);
  };


  @Delete('document/dynamic/:name/:id/:where')
  removeDocumentDynamic(@Param('name') name: string, @Param('id') id: string, @Param('where') where: string) {
    return this.jobService.removeDocumentDynamic(+id, name, where);
  };

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  };
}
