import {
  IsNumber,
  Min,
} from "class-validator";

export class UpdateBudgetDto {
  @IsNumber()
  @Min(0.01)
  dailyBudget!: number;

  @IsNumber()
  @Min(0.01)
  totalBudget!: number;
}