import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CardCompanyService } from './card_company.service';
import { CreateCardCompanyDto } from './dto/create-card_company.dto';
import { UpdateCardCompanyDto } from './dto/update-card_company.dto';

@Controller('card-company')
export class CardCompanyController {
  constructor(private readonly cardCompanyService: CardCompanyService) {}

  @Post()
  create(@Body() createCardCompanyDto: CreateCardCompanyDto) {
    return this.cardCompanyService.create(createCardCompanyDto);
  }

  @Get(':CNPJ')
  findAllCardOneCompany(@Param('CNPJ') CNPJ: string) {
    return this.cardCompanyService.findAllCardOneCompany(CNPJ);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardCompanyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardCompanyDto: UpdateCardCompanyDto) {
    return this.cardCompanyService.update(+id, updateCardCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardCompanyService.remove(+id);
  }
}
