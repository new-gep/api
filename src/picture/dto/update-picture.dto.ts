import { PartialType } from '@nestjs/swagger';
import { CreatePictureDto } from './create-picture.dto';

export class UpdatePictureDto extends PartialType(CreatePictureDto) {
    CPF_collaborator?:any;
    id_work  ?:any;
    status   ?:string;
    picture  ?:string;
    id_user  ?:any;
    update_at?:string;
    delete_at?:string;
}
