import {
  IsMongoId,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';


export class CreateTourDto {


  @IsMongoId()
  property: string;



  @IsMongoId()
  tenant: string;



  @IsOptional()
  @IsMongoId()
  agent?: string;



  @IsDateString()
  scheduledDate: string;



  @IsOptional()
  @IsString()
  scheduledTime?: string;



  @IsOptional()
  @IsString()
  notes?: string;



  @IsOptional()
  @IsString()
  tenantMessage?: string;



  @IsOptional()
  @IsString()
  location?: string;

}