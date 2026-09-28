import {
  IsNumber,
  Min,
} from "class-validator";

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(10)
  amount!: number;
}