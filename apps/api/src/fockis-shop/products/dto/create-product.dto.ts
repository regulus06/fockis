import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from "class-validator";

import { Transform } from "class-transformer";


export class CreateProductDto {


  // =========================
  // BASIC INFO
  // =========================

  @IsString()
  name!: string;



  @IsOptional()
  @IsString()
  description?: string;




  // =========================
  // PRICE
  // =========================

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  price!: number;



  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;




  // =========================
  // STOCK
  // =========================

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  stock!: number;




  // =========================
  // CATEGORY
  // =========================

  @IsString()
  category!: string;




  // =========================
  // MEDIA
  // =========================

  @IsOptional()
  @IsArray()
  images?: string[];





  // =========================
  // STORE CONNECTION
  // CUSTOMER SELECTS STORE
  // SELLER CAN OWN MANY STORES
  // =========================

  @IsString()
  storeId!: string;





  // =========================
  // MARKETPLACE DISPLAY
  // =========================

  @IsOptional()
  @IsArray()
  displayLocations?: string[];





  // =========================
  // FEED PROMOTION
  // =========================

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  feedDays?: number;



  // =========================
  // STORY PROMOTION
  // =========================

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  storyDays?: number;

}