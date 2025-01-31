import { PartialType } from '@nestjs/swagger';
import { CreateCardCompanyDto } from './create-card_company.dto';

export class UpdateCardCompanyDto extends PartialType(CreateCardCompanyDto) {
    cvc: string;
    expiry: string;
    number: string;
    name: string;
    user_update: string;
    updated_at: string;
}
