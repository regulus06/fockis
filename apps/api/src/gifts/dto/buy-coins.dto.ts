import {
  IsNumber,
  Min,
  IsString,
} from "class-validator";


export class BuyCoinsDto {


  @IsNumber()
  @Min(1)
  coins!: number;


  /*
    Stripe payment reference
  */

  @IsString()
  paymentId!: string;

}