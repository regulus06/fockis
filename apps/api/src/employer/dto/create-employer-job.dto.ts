import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmployerJob {
  // Add explicit allowlisted fields and validators matching the final schema.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
