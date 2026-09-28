import {
  IsOptional,
  IsString,
} from "class-validator";

export class ConnectAccountDto {
  @IsOptional()
  @IsString()
  country?: string;
}