import { IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateAddressDto {
  @IsString()
  @MaxLength(120)
  country!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional() @IsString() @MaxLength(120)
  departmentOrRegion?: string;

  @IsOptional() @IsString() @MaxLength(120)
  communeOrCity?: string;

  @IsOptional() @IsString() @MaxLength(160)
  neighborhood?: string;

  @IsOptional() @IsString() @MaxLength(180)
  street?: string;

  @IsOptional() @IsString() @MaxLength(40)
  houseNumber?: string;

  @IsOptional() @IsString() @MaxLength(40)
  postalCode?: string;

  @IsOptional() @IsString() @MaxLength(200)
  landmark?: string;

  @IsOptional() @IsString() @MaxLength(300)
  addressLine?: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional() @IsString() @MaxLength(300)
  mapboxPlaceId?: string;

  @IsOptional() @IsString() @MaxLength(160)
  buildingName?: string;

  @IsOptional() @IsString() @MaxLength(80)
  buildingNumber?: string;
}
