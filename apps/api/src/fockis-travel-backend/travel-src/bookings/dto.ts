import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateBookingDto {
  @IsString() listingId!: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsOptional() @IsNumber() @Min(1) quantity?: number;
  @IsOptional() @IsNumber() @Min(1) guests?: number;
  @IsOptional() @IsString() notes?: string;
}
