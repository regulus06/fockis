import { IsOptional, IsString } from "class-validator";


export class RejectPropertyDto {


  @IsOptional()
  @IsString()
  reason?: string;


}