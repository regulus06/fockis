import { IsOptional, IsString, MaxLength } from 'class-validator';
export class RejectEmployer { @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
