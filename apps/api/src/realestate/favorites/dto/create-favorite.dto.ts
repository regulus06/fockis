import {
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';


export class CreateFavoriteDto {


  @IsMongoId()
  user: string;



  @IsMongoId()
  property: string;



  @IsOptional()
  @IsString()
  notes?: string;

}