import {
  IsString,
  IsOptional,
  IsMongoId,
} from "class-validator";



export class CreateNotificationDto {



  @IsMongoId()
  recipientId!: string;





  @IsOptional()
  @IsMongoId()
  senderId?: string;





  @IsString()
  type!: string;





  @IsString()
  title!: string;





  @IsString()
  message!: string;





  @IsOptional()
  @IsString()
  entityId?: string;





  @IsOptional()
  @IsString()
  entityType?: string;





  @IsOptional()
  @IsString()
  image?: string;





  @IsOptional()
  @IsString()
  link?: string;



}