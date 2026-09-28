import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

import { ScanType } from '../schemas/create-scan.schema';

export class ScanDocumentDto {
  @ApiProperty({
    description: 'Type of scan being created',
    enum: [
      'document',
      'receipt',
      'id',
      'photo',
      'handwriting',
    ],
    example: 'document',
  })
  @IsString()
  @IsIn([
    'document',
    'receipt',
    'id',
    'photo',
    'handwriting',
  ])
  type!: ScanType;

  @ApiPropertyOptional({
    description: 'Optional name or title for the scan',
    example: 'My scanned document',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional language hint for OCR',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;
}