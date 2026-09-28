import { PartialType } from '@nestjs/mapped-types';
import { CreateDesignDto } from './create-design.dto';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDesignDto extends PartialType(CreateDesignDto) {
  @IsOptional() @IsBoolean() favorite?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
}
