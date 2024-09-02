import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { SingInCollaboratorDto } from './dto/auth/singIn.dto';
@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  create(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.create(createCollaboratorDto);
  }

  @Post('SingIn')
  singIn(@Body() singInCollaboratorDto: SingInCollaboratorDto) {
    return this.collaboratorService.singIn(singInCollaboratorDto);
  }

  @Post('checkCollaborator')
  check(@Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.checkCollaborator(createCollaboratorDto);
  }

  @Get()
  findAll() {
    return this.collaboratorService.findAll();
  }

  @Get('resend/email/:email')
  resendEmail(@Param('email') email: string) {
    return this.collaboratorService.resendCodeEmail(email);
  }

  @Get(':CPF')
  findOne(@Param('CPF') CPF: string) {
    return this.collaboratorService.findOne(CPF);
  }

  @Patch(':CPF')
  update(@Param('CPF') CPF: string, @Body() updateCollaboratorDto: UpdateCollaboratorDto) {
    return this.collaboratorService.update(CPF, updateCollaboratorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.collaboratorService.remove(+id);
  }
}
