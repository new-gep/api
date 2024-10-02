export class CreateUserDto {
    id?:string
    user:string
    password:string
    email:string
    phone:string
    CNPJ_client ?:string
    CNPJ_company?:string
    create_at?:string
}
