import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  licenseNumber: string;

  @IsOptional()
  @IsString()
  brokerage?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  officeAddress?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumber()
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  specialties?: string[];

  @IsOptional()
  @IsArray()
  serviceAreas?: string[];

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsBoolean()
  acceptingClients?: boolean;

  @IsOptional()
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
}