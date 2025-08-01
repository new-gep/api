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
  Inject,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { FilterServiceDto } from './dto/filter-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpadteJobDto } from './dto/update.job.dto';
import { UploadServiceDto } from '../company/dto/upload-service.dto';
import {
  ClientProxy,
  Payload,
  EventPattern,
  MessagePattern,
} from '@nestjs/microservices';
import { NotificationJobDto } from './dto/notification-job.dto';

@Controller('job')
export class JobController {
  constructor(
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
    private readonly jobService: JobService,
  ) {}

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Post('findAll')
  findAllService(@Body() filterServiceDto: FilterServiceDto) {
    return this.jobService.findAllService(filterServiceDto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCollaboratorDto: UpadteJobDto,
  ) {
    return this.jobService.uploadFile(uploadCollaboratorDto, file);
  }

  @Post('notification')
  async notification(@Body() notificationJobDto: NotificationJobDto) 
  {
    return this.jobService.sendNotification(notificationJobDto);
  }

  @Post('service/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileSignature(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      year: string;
      month: string;
      id_work: string;
      type: string;
      name: string;
      CPF_collaborator: string;
      date: Date;
    },
  ) {
    return this.jobService.UploadJobFileAbsence(
      {
        year: body.year,
        month: body.month,
        id_work: body.id_work,
        type: body.type,
        name: body.name,
        //@ts-ignore
        CPF_collaborator: body.cpf,
        date: body.date,
      },
      file,
    );
  }

  @Post('document/signature')
  async generateDocumentAsignature(
    @Body() uploadCollaboratorDto: UpadteJobDto,
  ) {
    return this.jobService.UploadJobFileSignature(uploadCollaboratorDto);
  }

  @Get('file/:id/:name/:signature/:dynamic/')
  findFile(
    @Param('id') id: string,
    @Param('name') name: string,
    @Param('dynamic') dynamic: string,
    @Param('signature') signature: Boolean,
  ) {
    return this.jobService.findFile(+id, name, signature, dynamic);
  }

  @Get('service/:type/:cnpj/:month/:year/')
  findAllServiceByMonthAndYear(
    @Param('cnpj') cnpj: string,
    @Param('month') month: string,
    @Param('year') year: string,
    @Param('type') type: string,
  ) {
    return this.jobService.FindAllServiceByMonthAndYear(
      cnpj,
      month,
      year,
      type,
    );
  }

  @Get('admissional/check/:id')
  checkDocumentAdmissional(@Param('id') id: string) {
    return this.jobService.checkDocumentAdmissional(+id);
  }

  @Get('dismissal/check/:id')
  checkDocumentDismissal(@Param('id') id: string) {
    return this.jobService.checkDocumentDismissal(+id);
  }

  @Get('all/:cpf')
  findAllJobsCollaborator(@Param('cpf') cpf: string) {
    return this.jobService.findAllJobsCollaborator(cpf);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get('search/:job')
  findAllOpen(@Param('job') job: string) {
    return this.jobService.findAllOpen(job);
  }

  @Get('process/:cpf')
  findProcess(@Param('cpf') cpf: string) {
    return this.jobService.findProcess(cpf);
  }

  @Get('history/:cpf')
  findHistory(@Param('cpf') cpf: string) {
    return this.jobService.findHistory(cpf);
  }

  @Get('findActualOrLastCompany/:cpf')
  findActualOrLastCompany(@Param('cpf') cpf: string) {
    return this.jobService.findActualOrLastCompany(cpf);
  }

  @Get('FindAllCandidacy/:cpf')
  FindAllCandidacy(@Param('cpf') cpf: string) {
    return this.jobService.FindAllCandidacy(cpf);
  }

  @Get('collaborator/company/:cnpj')
  findCollaboratorCompany(@Param('cnpj') cnpj: string) {
    return this.jobService.findCollaboratorCompany(cnpj);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.jobService.findOne(id);
  }

  @Get('collaborator/aplicated/job/:cpf')
  findAllAplicatedInJob(@Param('cpf') cpf: string) {
    return this.jobService.findAllAplicatedInJob(cpf);
  }

  @Get('open/:cnpj')
  jobOpen(@Param('cnpj') cnpj: string) {
    return this.jobService.findJobOpen(cnpj);
  }

  @Get('process/admissional/:cnpj')
  jobProcessAdmissional(@Param('cnpj') cnpj: string) {
    return this.jobService.findProcessAdmissional(cnpj);
  }

  @Get('fileService/:id/:typeService/:year/:month')
  jobServices(
    @Param('id') id: any,
    @Param('typeService') typeService: any,
    @Param('year') year: any,
    @Param('month') month: any,
  ) {
    // console.log("testando jobServices", id, typeService, year, month);
    return this.jobService.jobServices(id, typeService, year, month);
  }

  @Get('FindAllService/:cpf')
  FindAllService(@Param('cpf') cpf: string) {
    // return this.jobService.findAllService(cpf);
  }

  @Get('process/demissional/:cnpj')
  jobProcessDemissional(@Param('cnpj') cnpj: string) {
    return this.jobService.findProcessDemissional(cnpj);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(id, updateJobDto);
  }

  @Patch('apply/:id/:cpf')
  apply(@Param('id') id: string, @Param('cpf') cpf: string) {
    return this.jobService.applyJob(+id, cpf);
  }

  @Patch('statusCandidate/:id/')
  statusCandidate(@Param('id') id, @Body() updateStatusCandidateDto: {candidate:string}) {
    return this.jobService.updateStatusCandidate(updateStatusCandidateDto, +id);
  }

  @Patch('unapply/:id/:cpf')
  unapplyJob(@Param('id') id: string, @Param('cpf') cpf: string) {
    return this.jobService.unapplyJob(+id, cpf);
  }

  @Delete('document/dynamic/:name/:id/:where')
  removeDocumentDynamic(
    @Param('name') name: string,
    @Param('id') id: string,
    @Param('where') where: string,
  ) {
    return this.jobService.removeDocumentDynamic(+id, name, where);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  }

  // TASK
  @Post('apply')
  async applyToJob(@Body() data: any) {
    this.client.emit('res_apply', data); // envia para a fila
    return { status: 200, message: 'Candidatura enviada para processamento' }; // resposta imediata
  }

  @EventPattern('res_apply')
  async handleApply(@Payload() data: any) {
  }

  // RESPONSE
  // @MessagePattern('res_apply')
  // async handleApply(@Payload() data: any) {
  //   // Aqui você atualiza a vaga com o novo candidato
  //   console.log('caiu aqui')
  //   await this.jobService.applyJob(data);
  // }
}
