export class CreateCompanyDto {
    user    :string
    password:string
    CNPJ    :string
    email   : string
    company_name: string
    municipal_registration?: string
    state_registration    ?: string
    type_account:string
    phone   : string
    responsible: string
    zip_code: string
    state  ?: string
    district: string
    city  : string
    number: number
    street: string
    uf    : string
    isVisible   ?: string
    create_at?:string
}
