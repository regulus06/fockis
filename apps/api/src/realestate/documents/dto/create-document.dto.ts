import {
  IsMongoId,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';



export class CreateDocumentDto {


  @IsMongoId()
  property:string;



  @IsOptional()
  @IsMongoId()
  uploadedBy?:string;



  @IsOptional()
  @IsMongoId()
  tenant?:string;



  @IsOptional()
  @IsMongoId()
  landlord?:string;



  @IsString()
  title:string;



  @IsString()
  fileUrl:string;



  @IsOptional()
  @IsString()
  fileType?:string;



  @IsOptional()
  @IsNumber()
  fileSize?:number;



  @IsOptional()
  @IsString()
  type?:string;



  @IsOptional()
  expiresAt?:Date;



  @IsOptional()
  @IsString()
  notes?:string;

}