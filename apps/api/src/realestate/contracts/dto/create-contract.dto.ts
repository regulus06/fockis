import {
  IsMongoId,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';



export class CreateContractDto {


  @IsMongoId()
  property:string;



  @IsOptional()
  @IsMongoId()
  createdBy?:string;



  @IsOptional()
  @IsMongoId()
  tenant?:string;



  @IsOptional()
  @IsMongoId()
  landlord?:string;



  @IsOptional()
  @IsMongoId()
  agent?:string;



  @IsString()
  title:string;



  @IsOptional()
  @IsString()
  description?:string;



  @IsOptional()
  @IsString()
  documentUrl?:string;



  @IsOptional()
  @IsString()
  type?:string;



  @IsOptional()
  @IsNumber()
  amount?:number;



  @IsOptional()
  startDate?:Date;



  @IsOptional()
  endDate?:Date;



  @IsOptional()
  @IsString()
  notes?:string;


}