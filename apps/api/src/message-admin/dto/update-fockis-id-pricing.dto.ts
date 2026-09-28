import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateFockisIdPricingDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  oneTime?: boolean;

  @IsBoolean()
  @IsOptional()
  recurring?: boolean;

  @IsBoolean()
  @IsOptional()
  requirePayment?: boolean;
}