import {
  IsMongoId,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';



export class CreateLeaseDto {


  @IsMongoId()
  property: string;



  @IsMongoId()
  tenant: string;



  @IsOptional()
  @IsMongoId()
  landlord?: string;



  @IsOptional()
  @IsMongoId()
  agent?: string;



  @IsDateString()
  startDate: string;



  @IsDateString()
  endDate: string;



  @IsNumber()
  monthlyRent: number;



  @IsOptional()
  @IsNumber()
  securityDeposit?: number;



  @IsOptional()
  @IsNumber()
  paymentDay?: number;



  @IsOptional()
  @IsString()
  terms?: string;



  @IsOptional()
  @IsString()
  documentUrl?: string;



  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;



}