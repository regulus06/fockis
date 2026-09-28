import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

import { StoreCurrency } from "../schemas/store.schema";

export class CreateStoreDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  /*
   * Seller supplies only the domain prefix.
   *
   * Example:
   * regulusfashion
   *
   * Backend creates:
   * regulusfashion.fockis.com
   */
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    {
      message:
        "Domain name can contain only lowercase letters, numbers, and hyphens and cannot start or end with a hyphen.",
    },
  )
  domainName!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  /*
   * The country name can come from the Fockis country
   * selector or from a new country supplied by the seller.
   */
  @IsString()
  @MinLength(2)
  country!: string;

  /*
   * Two-letter country identifier used when generating
   * the Fockis Store ID.
   *
   * Examples:
   * US
   * HT
   * CA
   */
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: "Country code must contain exactly two letters.",
  })
  countryCode!: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsString()
  @MinLength(2)
  address!: string;

  @IsOptional()
  @IsString()
  state?: string;

  /*
   * Haiti is the only country where the postal/ZIP code
   * may be omitted.
   *
   * For every other country, a ZIP/postal code is required.
   */
  @ValidateIf((value) => value.countryCode?.toUpperCase() !== "HT")
  @IsString()
  @MinLength(1, {
    message: "ZIP/postal code is required for this country.",
  })
  zipCode!: string;

  @IsEnum(StoreCurrency)
  currency!: StoreCurrency;

  @IsOptional()
  @IsString()
  shippingPolicy?: string;

  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}