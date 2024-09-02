import { PartialType } from '@nestjs/swagger';
import { CreateCollaboratorDto } from './create-collaborator.dto';

export class UpdateCollaboratorDto extends PartialType(CreateCollaboratorDto) {
    cpf     ?: string;
    email   ?: string;
    name    ?: string;
    password?: string;
    phone   ?: string;
    terms   ?: string;
    zip_code ?:string;
    street   ?:string;
    district ?:string;
    city     ?:string;
    uf       ?:string;
    complement?:string;
    number   ?:number;
    id_work  ?:string
    update_at?:string;
}
