import { IsOptional, IsString } from 'class-validator';

export class ProductSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;
}