import { PartialType } from '@nestjs/swagger';
import { CreateAbsenceDto } from './create-absence.dto';

export class UpdateAbsenceDto  extends PartialType(CreateAbsenceDto) {
    name?: string;
    observation?: string;
    status ?: string;
    time  ?: string;
    CPF_collaborator?:string;
    id_work?: number;
    update_at?: string;
}
