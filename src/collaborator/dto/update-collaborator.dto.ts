import { PartialType } from '@nestjs/swagger';
import { CreateCollaboratorDto } from './create-collaborator.dto';

export class UpdateCollaboratorDto extends PartialType(CreateCollaboratorDto) {
    cpf     ?: any;
    email   ?: string;
    name    ?: string;
    sex     ?: string;
    phone   ?: string;
    birth?:string;
    terms   ?: string;
    marriage?:string;
    presentation?:string;
    about?:any;
    howWork?:any;
    service?:any;
    children?: {
        [key: string]: {
            name?: string;
            birth?: string;
        };
    } | 0;
    zip_code ?:string;
    street   ?:string;
    district ?:string;
    city     ?:string;
    uf       ?:string;
    complement?:string;
    number   ?:string;
    id_work  ?:any;
    PCD  ?:string;
    update_at?:string;
};
