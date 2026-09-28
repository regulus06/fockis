import { IsMongoId, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateAddressRequestDto {
  @IsMongoId()
  addressId!: string;

  @IsMongoId()
  unitId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
