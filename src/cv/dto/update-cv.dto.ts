import { PartialType } from '@nestjs/swagger';
import { CreateCvDto } from './create-cv.dto';

export class UpdateCvDto extends PartialType(CreateCvDto) {
    school?: string;
    experience?: string;
    skills?: string;
    acting?: string;
    working?: string;
    CPF_collaborator?: string;
    create_at?: string;
    update_at?: string;
    delete_at?: string;
}
