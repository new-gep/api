import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PictureService } from './picture.service';
import { CreatePictureDto } from './dto/create-picture.dto';
import { UpdatePictureDto } from './dto/update-picture.dto';

@Controller('picture')
export class PictureController {
  constructor(private readonly pictureService: PictureService) {}

  @Post()
  create(@Body() createPictureDto: CreatePictureDto) {
    return this.pictureService.create(createPictureDto);
  }

  @Get()
  findAll() {
    return this.pictureService.findAll();
  }

  @Get('signature/admission/:CPF/:id_work')
  findSignatureAdmission(@Param('CPF') CPF_collaborator: string, @Param('id_work') id_work: number) {
    return this.pictureService.findSignatureAdmission(CPF_collaborator, id_work);
  }

  @Get('signature/dismissal/:CPF/:id_work')
  findSignatureDismissal(@Param('CPF') CPF_collaborator: string, @Param('id_work') id_work: number) {
    return this.pictureService.findSignatureDismissal(CPF_collaborator, id_work);
  }

  @Get(':CPF')
  findOne(@Param('CPF') CPF_collaborator: string) {
    return this.pictureService.findOne(CPF_collaborator);
  }

  @Patch(':cpf')
  update(@Param('cpf') CPF: string, @Body() updatePictureDto: UpdatePictureDto) {
    return this.pictureService.update(CPF, updatePictureDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pictureService.remove(+id);
  }
}
