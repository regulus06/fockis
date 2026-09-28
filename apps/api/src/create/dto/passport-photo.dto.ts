import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PassportPhotoDto {
  @IsString()
  country!: string;

  @IsString()
  documentType!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  height?: number;

  @IsOptional()
  @IsIn(['mm', 'in', 'px'])
  unit?: 'mm' | 'in' | 'px';

  @IsOptional()
  @IsString()
  background?: string;
}