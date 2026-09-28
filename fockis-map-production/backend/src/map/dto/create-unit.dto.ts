import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUnitDto {
  @IsString()
  @MaxLength(80)
  unitNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;

  @IsOptional()
  @IsIn(["APARTMENT", "HOUSE", "ROOM", "SUITE", "OFFICE", "OTHER"])
  unitType?: string;
}
