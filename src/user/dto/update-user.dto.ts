import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    confirmPassword?:string
    avatar?:string
    user?:string
    password?:string
    hierarchy?:string
    name?:string
    email?:string
    phone?:string
    CNPJ_client ?:any
    CNPJ_company?:any
    update_at?:string
  
}
