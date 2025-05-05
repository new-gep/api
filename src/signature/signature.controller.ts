import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { Request as ExpressRequest } from 'express'; 
import { SignatureService } from './signature.service';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { UpdateSignatureDto } from './dto/update-signature.dto';

@Controller('signature')
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post()

  create(@Req() request: ExpressRequest, @Body() createSignatureDto: CreateSignatureDto) {
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const cleanIp = typeof ip === 'string' ? ip.replace('::ffff:', '') : ip?.[0];
    console.log(`IP do cliente: ${cleanIp}`);
    return this.signatureService.create(createSignatureDto);
  }

  @Get()
  findAll() {
    return this.signatureService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.signatureService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSignatureDto: UpdateSignatureDto) {
    return this.signatureService.update(+id, updateSignatureDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.signatureService.remove(+id);
  }
}
