import { Injectable } from '@nestjs/common';
import { CreateAssistantDto } from './dto/create-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';
import OpenAI from "openai";

@Injectable()
export class AssistantService {
  private key:string = process.env.KEY_API;
  private assistant_recruit:string = process.env.RECRUIT;
  private client:any;

  onModuleInit() {
    this.client = new OpenAI({ apiKey: this.key });
  }

  create(createAssistantDto: CreateAssistantDto) {
    return 'This action adds a new assistant';
  }

  findAll() {
    return `This action returns all assistant, ${this.key} ${this.assistant_recruit}`;
  }

  findOne(id: number) {
    return `This action returns a #${id} assistant`;
  }

  update(id: number, updateAssistantDto: UpdateAssistantDto) {
    return `This action updates a #${id} assistant`;
  }

  remove(id: number) {
    return `This action removes a #${id} assistant`;
  }
}
