import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { RecruitProps } from './dto/recruit-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('recruit/autocomplet')
  sendMessageRecruitAutoComplet(@Body() RecruitProps: RecruitProps) {
    // console.log('complet')
    RecruitProps.assistant = process.env.RECRUIT_AUTOCOMPLET;
    return this.assistantService.sendMessageRecruit(RecruitProps);
  }

  @Post('recruit/chat')
  sendMessageRecruitChat(@Body() RecruitProps: RecruitProps) {
    // console.log('chat')
    RecruitProps.assistant = process.env.RECRUIT_CHAT;
    return this.assistantService.sendMessageRecruit(RecruitProps);
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
