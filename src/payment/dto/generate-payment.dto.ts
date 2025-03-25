export class GeneratePaymentDto {
    CNPJ_Company: string;
    method: string;
    amount: number;
    status?: string;
    name?: string;
    cpf?: string;
    email?: string;
    phone?: string;
    additionalInfo?: string;
    numberCard?: string;
    nameCard?: string;
    expiresAtCard?: string;
    cvvCard?: string;
}
