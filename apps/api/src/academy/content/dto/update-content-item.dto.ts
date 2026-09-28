import { PartialType } from '@nestjs/mapped-types';
import { CreateContentItemDto } from './create-content-item.dto';

export class UpdateContentItemDto extends PartialType(CreateContentItemDto) {}
