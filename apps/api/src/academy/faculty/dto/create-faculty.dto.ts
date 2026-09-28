import { IsOptional, IsString } from 'class-validator';

export class CreateFacultyDto {
  @IsString() name: string;
  @IsString() dept: string;
  @IsString() pos: string;
  @IsString() edu: string;
  @IsString() tag: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() photoUrl?: string;
}
