import { PartialType } from '@nestjs/swagger';
import { CreateCvDto } from './create-cv.dto';

export class UpdateCvDto extends PartialType(CreateCvDto) {
    education?: string;
    experience?: string;
    skills?: string;
    update_at?: string;
}
