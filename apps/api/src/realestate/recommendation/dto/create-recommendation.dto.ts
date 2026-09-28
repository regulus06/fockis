import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';



export class CreateRecommendationDto {


  @IsMongoId()
  user:string;



  @IsMongoId()
  property:string;



  @IsNumber()
  score:number;



  @IsString()
  reason:string;



  @IsOptional()
  @IsString()
  type?:string;



  @IsOptional()
  metadata?:Record<string,any>;

}