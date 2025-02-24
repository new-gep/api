import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import generateSecurityCode from '../../hooks/securityCode';
import ConvertImageToBase64 from 'hooks/covertImageToBase64';
import FindTimeSP from 'hooks/time';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'newgep.developer@gmail.com',
        pass: 'fbce ifgi bnsg tebr',
      },
    });
  }

  async sendEmail(sendEmailDTO) {
    const fileDates = JSON.parse(sendEmailDTO.body);
    let attachments;
    if (fileDates.oneFile) {
      attachments = [
        {
          filename: `${fileDates.filename}.pdf`,
          content: sendEmailDTO.file.buffer,
        },
      ];
    } else {
      attachments = [
        {
          filename: `${fileDates.filename}.zip`,
          content: sendEmailDTO.file.buffer,
        },
      ];
    }
    const mailOptions = {
      to: fileDates.to,
      subject: fileDates.subject,
      text: fileDates.text,
      attachments,
    };
    try {
      const info = await this.transporter.sendMail(mailOptions);
      return 200;
    } catch (error) {
      return 500;
    }
  }

  async sendCode(email: string) {
    const code = generateSecurityCode();
    const htmlBody = `
    <body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 50vh;">
      <div style="background-color: #fde047; font-weight: bold; padding: 24px; text-align: center;">
        <p style="font-size: 32px; color: #000000;">Olá!</p>
        <div style="justify-items: center; align-items: center;">
          <p style="font-size: 14px; color: #000000; width: 400px; text-align: justify;">Por favor, retorne à tela do aplicativo e insira o código abaixo para confirmar sua identidade.</p>
          <p style="font-size: 28px; color: #fde047; font-weight: bold; background-color: #000000; padding: 10px; border-radius: 10px;">${code}</p>
        </div>
        <p style="font-size: 10px; color: #000000; font-weight: light;">A validade deste código se mantém até ser utilizado ou substituído, ou é vitalício.</p>
      </div>
    </body>
    `;
    const mailOptions = {
      to: email,
      subject: 'Código de verificação New Gep! (não responda este e-mail)',
      html: htmlBody,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      const params = {
        msg: 'Success send code for email',
        code: code,
        status: 200,
      };
      return params;
    } catch (error) {
      return 500;
    }
  }

  async sendReportEmail(email: string, buffer: Buffer) {
    const date = await FindTimeSP(); // Exemplo de retorno: "2025-02-24T13:07:28.000Z"
    const dt = new Date(date);
    
    const day = dt.getUTCDate().toString().padStart(2, '0');
    const month = (dt.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth() retorna de 0 a 11
    const year = dt.getUTCFullYear();
    
    const hours = dt.getUTCHours().toString().padStart(2, '0');
    const minutes = dt.getUTCMinutes().toString().padStart(2, '0');
    const seconds = dt.getUTCSeconds().toString().padStart(2, '0');
    
    const formattedDateTime = `Data: ${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    
    const htmlBody = `
    <body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 50vh; width: 100vw;">
      <div style="background-color: #fde047; font-weight: bold; padding: 24px; text-align: center; border-radius: 20px;">
        <p style="font-size: 32px; color: #000000;">Olá!</p>
        <div style="display: flex; justify-content: center; align-items: center;">
          <p style="font-size: 14px; color: #000000; width: 400px; text-align: center;">Segue em anexo o relatório de serviços.</p>
        </div>
        <p style="font-size: 10px; color: #000000; font-weight: light;">Data: ${formattedDateTime}</p>
      </div>
    </body>
    `;

    const mailOptions = {
      to: email,
      subject: 'Relatório de Serviços New Gep! (não responda este e-mail)',
      html: htmlBody,
      attachments: [{ filename: `Relatorio_Servicos.xlsx`, content: buffer }],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return 200;
    } catch (error) {
      return 500;
    }
  }
}
