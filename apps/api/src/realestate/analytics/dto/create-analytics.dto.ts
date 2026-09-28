import {
  IsMongoId,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';



export class CreateAnalyticsDto {


  @IsOptional()
  @IsMongoId()
  property?:string;



  @IsOptional()
  @IsMongoId()
  agent?:string;



  @IsOptional()
  @IsMongoId()
  user?:string;



  @IsString()
  eventType:string;



  @IsOptional()
  @IsString()
  source?:string;



  @IsOptional()
  @IsString()
  location?:string;



  @IsOptional()
  @IsString()
  device?:string;



  @IsOptional()
  @IsNumber()
  duration?:number;



  @IsOptional()
  metadata?:Record<string,any>;


}