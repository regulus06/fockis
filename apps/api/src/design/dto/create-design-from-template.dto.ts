import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDesignFromTemplateDto {
  @IsString() @IsNotEmpty() templateId!: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
}
