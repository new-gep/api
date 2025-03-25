import axios from 'axios';
import findTimeSP from 'hooks/time';
import { Inject, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { GeneratePaymentDto } from './dto/generate-payment.dto';
@Injectable()
export class PaymentService {
  

  private readonly galaxId = process.env.CEL_CASH_ID;
  private readonly galaxHash = process.env.CEL_CASH_HASH;
  private accessToken: string;
  private tokenExpiry: number;

  constructor(
    @Inject('PAYMENT_REPOSITORY')
    private paymentRepository: Repository<Payment>,
  ) {
    this.getTokenGlobal();
    // this.getToken();
    // setTimeout(() => {
    //   this.registerPayment()
    // }, 3000);
  }

  private async getTokenGlobal() {
    const authString = `${this.galaxId}:${this.galaxHash}`;
    const base64AuthString =  Buffer.from(authString).toString('base64');
    const body = {
      grant_type: 'authorization_code',
      scope: 'customers.read customers.write plans.read plans.write transactions.read transactions.write webhooks.write balance.read balance.write cards.read cards.write card-brands.read subscriptions.read subscriptions.write charges.read charges.write boletos.read company.write'
    };
    try {
      const response = await axios.post(`${process.env.CEL_CASH_URL}/token`, body, {
        headers: {
          'Authorization': `Basic ${base64AuthString}`,
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      // Renove o token 60 segundos antes de expirar
      setTimeout(() => this.getToken(), (response.data.expires_in - 60) * 1000);
    } catch (error) {
      console.log(base64AuthString)
      console.log('Error obtaining access token:', error.response);
    }
  }

  private async getToken() {
    const authString = `${this.galaxId}:${this.galaxHash}`;
    const base64AuthString =  Buffer.from(authString).toString('base64');
    const body = {
      grant_type: 'authorization_code',
      scope: 'customers.read customers.write plans.read plans.write transactions.read transactions.write webhooks.write balance.read balance.write cards.read cards.write card-brands.read subscriptions.read subscriptions.write charges.read charges.write boletos.read'
    };
    try {
      const response = await axios.post(`${process.env.GALAX_URL}/token`, body, {
        headers: {
          'Authorization': `Basic ${base64AuthString}`,
        },
      });
      console.log(response.data.access_token)
      return response.data.access_token;
    } catch (error) {
      console.log(base64AuthString)
      console.log('Error obtaining access token:', error.response);
    }
  }

  // async webhook( payload: any){
  //   if(payload.event == 'transaction.updateStatus' ){
  //     switch (payload.Charge.mainPaymentMethodId) {
  //       case 'pix':
  //         if(payload.Transaction.status == 'payedPix'){
  //           const params_payment = {
  //             status:"paid"
  //           }
  //           const response = await this.paymentRaceService.update(payload.Charge.myId, params_payment)
  //           if(response.status == 200){
  //             return true
  //           }
  //           return{
  //             status: 500,
  //             message:'Payment internal incomplet'
  //           }
  //         }else{
  //           console.log(payload.Transaction.status)
  //         }
  //       break;
  //     }
  //   }
  //   // if(payload.event == 'company.cashOut' ){
  //   //   const webhookId = payload.webhookId;
  //   //   const idPayment = payload.Cashout.Pix.description.split(':');
  //   //   console.log(idPayment)
  //   //   const option = idPayment[1].split('-');
  //   //   switch (option[0]) {
  //   //     case 'raceRetrieve':
  //   //       if(payload.Cashout.Pix.status == 'efectivated'){
  //   //         const response = await this.paymentRaceRetrieveService.update(idPayment[1],{webhookId:webhookId.toString()})
  //   //         if(response.status == 200){
  //   //           return 'ação'
  //   //         }
  //   //         console.log(response)
  //   //       }
  //   //       break;
      
  //   //     case '':

  //   //       break;
  //   //   }
  //   // }
  // }

  async createPayment(generatePaymentDto:GeneratePaymentDto ){
    const token = await this.getToken()
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const currence = `${year}-${month}-${day}`;
    const time = findTimeSP()
    const CreatePaymentParams = {
      //@ts-ignore
      method   :generatePaymentDto.CreatePaymentDto.method,
      //@ts-ignore
      amount   :generatePaymentDto.CreatePaymentDto.amount,
      //@ts-ignore
      status   :generatePaymentDto.CreatePaymentDto.status,
      //@ts-ignore
      CNPJ_Company:generatePaymentDto.CreatePaymentDto.CNPJ_Company,
      create_at:time
    }
    const payment = await this.create(CreatePaymentParams)
    // console.log('payment', payment);
    let payment_params = {
      //@ts-ignore
      myId : payment.id,
      value: generatePaymentDto.amount,
      additionalInfo: generatePaymentDto.additionalInfo,
      payday:currence,
      Customer:{
        name:     generatePaymentDto.name,
        document: generatePaymentDto.CNPJ_Company,
        emails:   [generatePaymentDto.email],
        phones:   [generatePaymentDto.phone]
      },
      mainPaymentMethodId:generatePaymentDto.method,
      PaymentMethodPix:{},
      PaymentMethodCreditCard:{}
    }
    //@ts-ignore
    console.log('generatePaymentDto.CreatePaymentDto.method', generatePaymentDto.CreatePaymentDto.method);
    //@ts-ignore
    switch (generatePaymentDto.CreatePaymentDto.method.toLowerCase()) {
      case 'pix':
        payment_params.mainPaymentMethodId = 'pix'
        payment_params.PaymentMethodPix = {
          instructions : 'Pagamento New Gep LTDA',
          Deadline:{
            type: 'minutes',
            value: 15
          }
        }
        break;
      case 'creditcard':
        payment_params.mainPaymentMethodId = 'creditcard'
        payment_params.PaymentMethodCreditCard = {
          Card:{
            number:    generatePaymentDto.numberCard,
            holder:    generatePaymentDto.nameCard,
            expiresAt: generatePaymentDto.expiresAtCard,
            cvv:       generatePaymentDto.cvvCard
          },
          qtdInstallments:1
        }
        break;
      default:
        return{
          status:500,
          message:'Type payment not defined'
      }
    }
    try{
      const response = await axios.post(`${process.env.CEL_CASH_URL}/charges`, payment_params, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      console.log('response', response);
      if(generatePaymentDto.method == 'pix'){
        return {
          payment:response.data.Charge.Transactions[0].Pix,
          // idPayment:racePayment.id
        }
      }
      return response.data;
    }catch(error){
      console.log('erro',error.response.data.error)
      return{
        status:500,
        message:'Error cel_cash'
      }
    }
  }

  async create(createPaymentDto: CreatePaymentDto) {
    
    const newPayment = await this.paymentRepository.save(createPaymentDto);
    
    if(newPayment){
      return {
        status:200,
        message:'Payment created successfully',
        payment:newPayment
      }
    }
    return {
      status:500,
      message:'Error creating payment'
    }
  }

  findAll() {
    return `This action returns all payment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
