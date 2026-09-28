import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/* ============================================================================
   CREATE TRIP
============================================================================ */

export class CreateTripDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  items?: Record<string, any>[];
}

/* ============================================================================
   ADD TRIP ITEM
============================================================================ */

export class AddTripItemDto {
  @IsString()
  kind!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/* ============================================================================
   UPDATE TRIP STATUS
============================================================================ */

export class UpdateTripStatusDto {
  @IsString()
  @IsIn([
    'planning',
    'booked',
    'upcoming',
    'completed',
    'cancelled',
    'canceled',
  ])
  status!: string;
}