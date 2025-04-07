import { PartialType } from '@nestjs/swagger';
import { CreateAbsenceDto } from './create-absence.dto';

export class UpdateAbsenceDto  extends PartialType(CreateAbsenceDto) {
    name?: string;
    observation?: string;
    status ?: string;
    time  ?: string;
    CPF_collaborator?:any;
    id_work?: any;
    update_at?: string;
}
