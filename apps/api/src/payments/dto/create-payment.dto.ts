import {
  IsEnum,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { PaymentPurpose } from '../constants/payment-purpose.constants';

export class CreatePaymentDto {
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @IsString()
  @MinLength(1)
  referenceId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000)
  baseAmount!: number;

  @IsString()
  @Length(3, 3)
  baseCurrency!: string;

  @IsISO31661Alpha2()
  country!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, string>;
}