import { PartialType } from '@nestjs/swagger';
import { CreateUserTypeDto } from './create-user_type.dto';

export class UpdateUserTypeDto extends PartialType(CreateUserTypeDto) {}
