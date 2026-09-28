import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateFockisIdSettingsDto {
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  uniquenessRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  caseInsensitive?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  minimumLength?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maximumLength?: number;

  @IsString()
  @IsOptional()
  allowedCharactersPattern?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reservationDays?: number;

  @IsBoolean()
  @IsOptional()
  allowUserChange?: boolean;

  @IsBoolean()
  @IsOptional()
  allowUsernameStyleIds?: boolean;

  @IsBoolean()
  @IsOptional()
  allowNumbers?: boolean;

  @IsBoolean()
  @IsOptional()
  allowUnderscore?: boolean;

  @IsBoolean()
  @IsOptional()
  allowHyphen?: boolean;

  @IsBoolean()
  @IsOptional()
  allowPeriod?: boolean;
}