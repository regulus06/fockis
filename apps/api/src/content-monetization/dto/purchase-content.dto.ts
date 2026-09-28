import {
  IsEnum,
  IsString,
} from "class-validator";

import {
  PaymentMethod,
  PurchaseType,
} from "../types/content-monetization.types";

export class PurchaseContentDto {
  @IsString()
  contentId!: string;

  @IsEnum(PurchaseType)
  purchaseType!: PurchaseType;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}