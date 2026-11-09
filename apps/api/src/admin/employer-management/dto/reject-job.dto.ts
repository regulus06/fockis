import { IsOptional, IsString, MaxLength } from 'class-validator';
export class RejectJob { @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
