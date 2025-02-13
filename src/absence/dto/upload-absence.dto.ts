import { PartialType } from '@nestjs/swagger';
import { CreateAbsenceDto } from './create-absence.dto';

export class UploadAbsenceDto extends PartialType(CreateAbsenceDto) {
    id_work: any;
    typeService: any;
    year: any;
    month: any;
    name: string;
}
