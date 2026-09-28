import {
  IsMongoId,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';



export class CreateMaintenanceDto {


  @IsMongoId()
  property: string;



  @IsMongoId()
  tenant: string;



  @IsOptional()
  @IsMongoId()
  landlord?: string;



  @IsOptional()
  @IsMongoId()
  assignedAgent?: string;



  @IsString()
  title: string;



  @IsString()
  description: string;



  @IsOptional()
  @IsArray()
  images?: string[];



  @IsOptional()
  @IsNumber()
  estimatedCost?: number;



  @IsOptional()
  @IsString()
  notes?: string;


}