import { IsBoolean, IsOptional } from 'class-validator';

export class RsvpEventDto {
  @IsOptional()
  @IsBoolean()
  interested?: boolean;
}