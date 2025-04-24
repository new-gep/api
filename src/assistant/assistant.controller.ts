import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post()
  create(@Body() createAssistantDto: CreateAssistantDto) {
    return this.assistantService.create(createAssistantDto);
  }

  @Get()
  findAll() {
    return this.assistantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assistantService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssistantDto: UpdateAssistantDto) {
    return this.assistantService.update(+id, updateAssistantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assistantService.remove(+id);
  }
}
