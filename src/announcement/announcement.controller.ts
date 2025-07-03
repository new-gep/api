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
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { DeleteFilesAnnouncementDto } from './dto/deleteFiles-announcement.dto';
import { UploadAnnouncementDto } from './dto/upload-announcement.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  create(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementService.create(createAnnouncementDto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCollaboratorDto: UploadAnnouncementDto,
  ){
    return this.announcementService.uploadFile(uploadCollaboratorDto, file);
  }

  @Post('update/upload')
  @UseInterceptors(FileInterceptor('file'))
  async updateUploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCollaboratorDto: UploadAnnouncementDto,
  ){
    return this.announcementService.uploadFile(uploadCollaboratorDto, file);
  }

  @Get()
  findAll() {
    return this.announcementService.findAll();
  }

  @Get(':cpf')
  findOne(@Param('cpf') cpf: string) {
    return this.announcementService.findOne(cpf);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(+id, updateAnnouncementDto);
  }
  
  @Delete('files')
  removeFiles(@Body() deleteFilesAnnouncementDto: DeleteFilesAnnouncementDto) {
    return this.announcementService.removeFile(deleteFilesAnnouncementDto.key);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementService.remove(+id);
  }
}
