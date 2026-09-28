import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class HandwritingDto {
  @ApiPropertyOptional({
    description: 'Language to use for handwriting recognition.',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;
}