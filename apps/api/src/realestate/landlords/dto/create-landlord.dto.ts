import {
  IsString,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateLandlordDto {

  @IsString()
  firstName: string;


  @IsString()
  lastName: string;


  @IsOptional()
  @IsString()
  phone?: string;


  @IsOptional()
  @IsEmail()
  email?: string;


  @IsOptional()
  @IsString()
  profileImage?: string;


  @IsOptional()
  @IsString()
  address?: string;


  @IsOptional()
  @IsString()
  landlordType?: string;


  @IsOptional()
  @IsString()
  companyName?: string;
}