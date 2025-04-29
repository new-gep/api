import { Inject, Injectable } from '@nestjs/common';
import { CreateCardCompanyDto } from './dto/create-card_company.dto';
import { UpdateCardCompanyDto } from './dto/update-card_company.dto';
import { IsNull, Repository } from 'typeorm';
import { CardCompany } from './entities/card_company.entity';
import * as CryptoJS from 'crypto-js';
import findTimeSP from 'hooks/time';
@Injectable(

)
export class CardCompanyService {
  ENCRYPTION_KEY: string;
  IV_LENGTH: number;

  constructor(
    @Inject('CARD_COMPANY_REPOSITORY')
    private cardCompanyRepository: Repository<CardCompany>,
    
  ) {
    this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    this.IV_LENGTH = 16;
  }

  async create(createCardCompanyDto: CreateCardCompanyDto) {
    try{
      const time = findTimeSP();
      createCardCompanyDto.created_at = time;
      createCardCompanyDto.cvc    = CryptoJS.AES.encrypt(createCardCompanyDto.cvc, this.ENCRYPTION_KEY).toString();
      createCardCompanyDto.expiry = CryptoJS.AES.encrypt(createCardCompanyDto.expiry, this.ENCRYPTION_KEY).toString();
      createCardCompanyDto.number = CryptoJS.AES.encrypt(createCardCompanyDto.number, this.ENCRYPTION_KEY).toString();
      createCardCompanyDto.name   = CryptoJS.AES.encrypt(createCardCompanyDto.name, this.ENCRYPTION_KEY).toString();
      const response = await this.cardCompanyRepository.save(createCardCompanyDto);
      
      response.cvc = CryptoJS.AES.decrypt(response.cvc, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      response.expiry = CryptoJS.AES.decrypt(response.expiry, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      response.number = CryptoJS.AES.decrypt(response.number, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      response.name   = CryptoJS.AES.decrypt(response.name, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      if(response){
        return {
          status: 201,
          message: 'Card created successfully',
          data: response
        };
      }

      return {
        status: 400,
        message: 'Error creating card',
        data: null
      };

    }catch(error){
      return {
        status: 500,
        message: 'Error server internal',
        data: null
      };
    }
  }

  async findAllCardOneCompany(CNPJ: string) {
    if(!CNPJ || CNPJ === 'undefined'){
      return {
        status: 400,
        message: 'CNPJ is required',
        data: null
      };
    }

    return;
    try{
      const response = await this.cardCompanyRepository.find({  
        where: {
          CNPJ: {CNPJ : CNPJ},
          deleted_at: IsNull()
        }
      });

      if(response){
        response.forEach(card => {
          try {
              if (card.cvc) {
                card.cvc = CryptoJS.AES.decrypt(card.cvc, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8); 
              }
              if (card.expiry) {
                  card.expiry = CryptoJS.AES.decrypt(card.expiry, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
              }
              if (card.number) {
                  card.number = CryptoJS.AES.decrypt(card.number, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
              }
              if (card.name) {
                  card.name = CryptoJS.AES.decrypt(card.name, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
              }
          } catch (error) {
              console.error("Erro ao descriptografar dados:", error);
          }
        });

        // console.log(response);

        return {
          status: 200,
          message: 'Card found successfully',
          data: response
        };
      }

      return {
          status: 400,
          message: 'Error finding cards',
          data: null
      };
    }catch(error){
      console.log(error);
      return {
        status: 500,
        message: 'Error server internal',
        data: null
      };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} cardCompany`;
  }

  async update(id: number, updateCardCompanyDto: UpdateCardCompanyDto) {
    try{
      const time = findTimeSP();  
      updateCardCompanyDto.updated_at = time;
      updateCardCompanyDto.cvc    = CryptoJS.AES.encrypt(updateCardCompanyDto.cvc, this.ENCRYPTION_KEY).toString();
      updateCardCompanyDto.expiry = CryptoJS.AES.encrypt(updateCardCompanyDto.expiry, this.ENCRYPTION_KEY).toString();
      updateCardCompanyDto.number = CryptoJS.AES.encrypt(updateCardCompanyDto.number, this.ENCRYPTION_KEY).toString();
      updateCardCompanyDto.name   = CryptoJS.AES.encrypt(updateCardCompanyDto.name, this.ENCRYPTION_KEY).toString();
      const response = await this.cardCompanyRepository.update(id, updateCardCompanyDto);

      
    if(response.affected === 1){
      const card = await this.cardCompanyRepository.findOne({where: {id: id}}); 
      card.cvc = CryptoJS.AES.decrypt(card.cvc, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8); 
      card.expiry = CryptoJS.AES.decrypt(card.expiry, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      card.number = CryptoJS.AES.decrypt(card.number, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      card.name   = CryptoJS.AES.decrypt(card.name, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      return {
        status: 200,
        message: 'Card updated successfully',
        data: card
      };
    }

    return {
        status: 400,
        message: 'Error updating card',
        data: null
      };
    }catch(error){
      console.log(error);
      return {
        status: 500,
        message: 'Error server internal',
        data: null
      };
    }
  }

  async remove(id: number) {
    try{
      const response = await this.cardCompanyRepository.delete(id);
      console.log(response);
      if(response.affected === 1){
      return {
        status: 200,
        message: 'Card deleted successfully',
        data: null
      };
    }

    return {
      status: 400,
        message: 'Error deleting card',
        data: null
      };
    }catch(error){
      console.log(error);
      return {
        status: 500,
        message: 'Error server internal',
        data: null
      };
    }
  }
}

