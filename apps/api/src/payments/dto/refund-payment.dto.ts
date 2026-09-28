import { IsNumber, IsOptional, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
}
