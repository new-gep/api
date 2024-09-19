import { PartialType } from '@nestjs/swagger';
import { CreatePictureDto } from './create-picture.dto';

export class UpdatePictureDto extends PartialType(CreatePictureDto) {
    picture  ?:string;
    status   ?:string;
    id_user  ?:number;
    update_at?:string;
    delete_at?:string;
}
