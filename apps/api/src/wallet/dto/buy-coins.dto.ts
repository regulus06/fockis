import {
  IsNotEmpty,
  IsString,
} from "class-validator";

export class BuyCoinsDto {
  @IsString()
  @IsNotEmpty()
  packageId!: string;
}