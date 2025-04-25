import { Injectable } from '@nestjs/common';
import { RecruitProps } from './dto/recruit-assistant.dto';
import { UpdateAssistantDto } from './dto/update-assistant.dto';
import OpenAI from 'openai';

@Injectable()
export class AssistantService {
  private key: string = process.env.KEY_API;
  private client: any;

  onModuleInit() {
    this.client = new OpenAI({ apiKey: this.key });
  }

  async sendMessageRecruit(RecruitProps: RecruitProps) {
    return new Promise(async (resolve, reject) => {
      try {
        let threadId:any
        
        // Criando uma nova thread
        if(!RecruitProps.thread){
          const emptyThread = await this.client.beta.threads.create();
          if (!emptyThread || !emptyThread.id) {
            console.error('Erro ao criar a thread');
            return reject('Erro ao criar a thread'); // Rejeita a Promise se a thread não for criada
          }
          threadId = emptyThread.id;
        }else{
          threadId = RecruitProps.thread;
        };

        // Criando uma mensagem na thread
        await this.client.beta.threads.messages.create(threadId, 
          {
            role: 'user',
            content: RecruitProps.message,
          }
        );

        // Executando e esperando a conclusão da thread
        let run = await this.client.beta.threads.runs.createAndPoll(threadId, {
          assistant_id: RecruitProps.assistant,
        });

        if (run.status === 'completed') {
          // Listando as mensagens da thread após a execução
          const messages = await this.client.beta.threads.messages.list(
            run.thread_id,
          );
          // Verificando se a estrutura das mensagens está correta
          if (messages.data && messages.data[0] && messages.data[0].content) {
            //@ts-ignore
            const messageContent = messages.data[0].content[0].text?.value;
            if (messageContent) {
              return resolve({
                status:200,
                thread:threadId,
                response:messageContent
              }); // Resolve a Promise com o conteúdo da mensagem
            } else {
              console.error('Erro: Conteúdo da mensagem não encontrado');
              return reject('Conteúdo da mensagem não encontrado');
            }
          } else {
            console.error('Erro: Dados da mensagem não encontrados');
            return reject('Dados da mensagem não encontrados');
          }
        } else {
          console.log(`Status do run: ${run.status}`);
          return reject(`Status do run não é 'completed': ${run.status}`); // Rejeita se o status não for 'completed'
        };
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return reject(error); // Rejeita a Promise se ocorrer erro
      }
    });
  }

  findAll() {
    return `This action returns all assistant, ${this.key}`;
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

