export class CreateCardCompanyDto {
    name: string;
    number: string;
    cvc: string;
    expiry: string;
    CNPJ: string;
    user_create: string;
    created_at?: string;
}
