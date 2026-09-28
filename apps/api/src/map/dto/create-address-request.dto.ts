import {
IsEnum,
IsMongoId,
IsNotEmpty,
IsOptional,
IsString,
MaxLength,
} from "class-validator";

export enum AddressRequestType {
CREATE = "create",
UPDATE = "update",
DELETE = "delete",
}

export class CreateAddressRequestDto {
@IsEnum(AddressRequestType)
@IsOptional()
requestType?: AddressRequestType;

/**

* Existing Fockis Map address being requested.
*
* Required by MapService.createRequest()
* when the request targets an existing address.
  */
  @IsMongoId()
  @IsOptional()
  addressId?: string;

/**

* Unit associated with the address request.
*
* Required by MapService.createRequest().
  */
  @IsMongoId()
  @IsNotEmpty()
  unitId!: string;

@IsString()
@IsNotEmpty()
@MaxLength(200)
addressLine1!: string;

@IsString()
@IsOptional()
@MaxLength(200)
addressLine2?: string;

@IsString()
@IsNotEmpty()
@MaxLength(100)
city!: string;

@IsString()
@IsNotEmpty()
@MaxLength(100)
state!: string;

@IsString()
@IsNotEmpty()
@MaxLength(20)
postalCode!: string;

@IsString()
@IsNotEmpty()
@MaxLength(100)
country!: string;

@IsString()
@IsOptional()
@MaxLength(100)
region?: string;

@IsString()
@IsOptional()
@MaxLength(100)
county?: string;

@IsString()
@IsOptional()
@MaxLength(100)
neighborhood?: string;

@IsString()
@IsOptional()
@MaxLength(500)
reason?: string;
}
