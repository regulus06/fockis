import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";


/* ============================================================================
   CREATE BUSINESS DEAL DTO
============================================================================ */

export class CreateBusinessDealDto {

  @IsString()
  @MaxLength(150)
  title!: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  @IsOptional()
  @IsString()
  @MaxLength(80)
  discount?: string;


  @IsOptional()
  @IsString()
  @MaxLength(100)
  couponCode?: string;


  @IsDateString()
  expiresAt!: string;
}