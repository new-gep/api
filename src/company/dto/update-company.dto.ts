import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
    email   ?: string
    company_name?: string
    isVisible   ?: string
    municipal_registration?: string
    state_registration    ?: string
    type_account?:string
    phone   ?: string
    responsible?: string
    zip_code?: string
    district?: string
    state?: string
    city  ?: string
    number?: number
    street?: string
    uf    ?: string
    update_at?:string
}
