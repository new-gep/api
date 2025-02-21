import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
    name?: string;
    type?: string;
    status ?: string;
    id_work?: number;
    update_at?: string;
    dynamic?: string;
}
