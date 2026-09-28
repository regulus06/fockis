import { IsDateString, IsString } from 'class-validator';

export class CreateEventDto {
  @IsDateString() date: string;
  @IsString() d: string;
  @IsString() m: string;
  @IsString() title: string;
  @IsString() loc: string;
}
