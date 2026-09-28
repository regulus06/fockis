import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export const MAP_UNIT_TYPES = [
  "APARTMENT",
  "HOUSE",
  "ROOM",
  "SUITE",
  "OFFICE",
  "OTHER",
] as const;

export class CreateUnitDto {
  @IsString()
  @MaxLength(80)
  unitNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;

  @IsOptional()
  @IsIn(MAP_UNIT_TYPES)
  unitType?: string;
}