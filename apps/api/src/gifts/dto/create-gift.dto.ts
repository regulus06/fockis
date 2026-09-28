import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";


import {
  GiftCategory,
} from "../enums/gift-category.enum";


import {
  GiftRarity,
} from "../enums/gift-rarity.enum";



export class CreateGiftDto {


  @IsString()
  name!: string;


  @IsString()
  emoji!: string;


  @IsString()
  description!: string;


  @IsEnum(GiftCategory)
  category!: GiftCategory;


  @IsEnum(GiftRarity)
  rarity!: GiftRarity;


  @IsNumber()
  @Min(1)
  coinPrice!: number;


  @IsOptional()
  @IsString()
  image?: string;


  @IsOptional()
  @IsString()
  animation?: string;


  @IsOptional()
  @IsString()
  sound?: string;


  @IsOptional()
  @IsNumber()
  duration?: number;


  @IsOptional()
  @IsBoolean()
  fullScreenAnimation?: boolean;

}