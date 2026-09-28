import {
  IsString,
  IsOptional,
  IsMongoId,
  IsDateString,
} from 'class-validator';


export class CreateInquiryDto {


  @IsMongoId()
  user: string;



  @IsMongoId()
  property: string;



  @IsOptional()
  @IsMongoId()
  agent?: string;



  @IsOptional()
  @IsMongoId()
  landlord?: string;



  @IsString()
  subject: string;



  @IsString()
  message: string;



  @IsOptional()
  @IsDateString()
  preferredMoveDate?: Date;



  @IsOptional()
  @IsDateString()
  preferredTourDate?: Date;

}