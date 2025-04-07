export class CreatePaymentDto {
    CNPJ_Company: any;
    method: string;
    amount: number;
    status?: string;
    name?: string;
    cpf?: any;
    email?: string;
    phone?: string;
    additionalInfo?: string;
    numberCard?: string;
    nameCard?: string;
    expiresAtCard?: string;
    cvvCard?: string;
}
