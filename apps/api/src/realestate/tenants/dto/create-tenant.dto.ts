import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsDateString,
} from 'class-validator';


export class CreateTenantDto {


  @IsString()
  firstName: string;



  @IsString()
  lastName: string;



  @IsOptional()
  @IsEmail()
  email?: string;



  @IsOptional()
  @IsString()
  phone?: string;



  @IsOptional()
  @IsString()
  profileImage?: string;



  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;



  @IsOptional()
  @IsString()
  occupation?: string;



  @IsOptional()
  @IsString()
  employer?: string;



  @IsOptional()
  @IsNumber()
  monthlyIncome?: number;



  @IsOptional()
  @IsNumber()
  creditScore?: number;

}