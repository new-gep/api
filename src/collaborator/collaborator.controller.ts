import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { SingInCollaboratorDto } from './dto/auth/singIn.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadCollaboratorDto } from './dto/upload-collaborator.sto';
import { UpdateIdWorkCollaboratorDto } from './dto/updateIdWork-collaborator.dto';
@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.create(createCollaboratorDto);
  };

  @Post('SingIn')
  singIn(@Body() singInCollaboratorDto: SingInCollaboratorDto) {
    return this.collaboratorService.singIn(singInCollaboratorDto);
  };

  @Post('checkCollaborator')
  check(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.checkCollaborator(createCollaboratorDto);
  };

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() uploadCollaboratorDto:UploadCollaboratorDto) {
    return this.collaboratorService.uploadFile(uploadCollaboratorDto,file)
  };

  @Get()
  findAll() {
    return this.collaboratorService.findAll();
  };

  @Get('dossie/:cpf')
  findDossie(@Param('cpf') cpf: string,) {
    return this.collaboratorService.findDossie(cpf);
  };

  @Get('/file/:cpf/:file')
  findFile(
    @Param('cpf') cpf: string,
    @Param('file') file: string
  ) {
    return this.collaboratorService.findFile(cpf,file);
  };

  @Get('check/AccountCompletion/:cpf')
  checkAccountCompletion(@Param('cpf') cpf: string) {
    return this.collaboratorService.checkAccountCompletion(cpf);
  };

  @Get('resend/email/:email')
  resendEmail(@Param('email') email: string) {
    return this.collaboratorService.resendCodeEmail(email);
  };

  @Get(':CPF')
  findOne(@Param('CPF') CPF: string) {
    return this.collaboratorService.findOne(CPF);
  };

  @Patch(':CPF')
  update(@Param('CPF') CPF: string, @Body() updateCollaboratorDto: UpdateCollaboratorDto) {
    return this.collaboratorService.update(CPF, updateCollaboratorDto);
  };

  @Patch('idWork/:CPF')
  updateIdWork(@Param('CPF') CPF: string, @Body() updateCollaboratorDto: UpdateIdWorkCollaboratorDto) {
    return this.collaboratorService.updateIdWork(CPF, updateCollaboratorDto);
  };

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collaboratorService.remove(+id);
  };
}
