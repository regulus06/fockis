import { IsOptional, IsString } from 'class-validator';

/**
 * The frontend's `unlockPlaylist()` call currently sends an empty body — this
 * DTO exists so a real payment integration has somewhere to receive a
 * payment method / idempotency key without a breaking API change later.
 */
export class PurchasePlaylistDto {
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}