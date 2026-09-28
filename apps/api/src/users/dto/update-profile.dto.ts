import {

IsOptional,

IsString,

IsBoolean,

IsDateString

} from "class-validator";




export class UpdateProfileDto {





@IsOptional()

@IsString()

username?: string;






@IsOptional()

@IsString()

firstName?: string;







@IsOptional()

@IsString()

lastName?: string;







@IsOptional()

@IsString()

bio?: string;







@IsOptional()

@IsString()

location?: string;







@IsOptional()

@IsString()

website?: string;







@IsOptional()

@IsString()

phone?: string;







@IsOptional()

@IsString()

gender?: string;







@IsOptional()

@IsDateString()

birthDate?: string;







@IsOptional()

@IsString()

storeName?: string;







@IsOptional()

@IsString()

storeDescription?: string;







@IsOptional()

@IsBoolean()

isPrivate?: boolean;



}