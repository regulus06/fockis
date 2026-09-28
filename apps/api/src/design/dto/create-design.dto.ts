import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

class DesignElementDto {
  @IsString() @IsNotEmpty() id!: string;
  @IsIn(['text', 'shape', 'image', 'icon', 'line']) type!: string;
  @IsNumber() @Min(0) x!: number;
  @IsNumber() @Min(0) y!: number;
  @IsNumber() @Min(1) width!: number;
  @IsNumber() @Min(1) height!: number;
  @IsOptional() @IsNumber() rotation?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) opacity?: number;
  @IsOptional() @IsInt() zIndex?: number;
  @IsOptional() @IsBoolean() locked?: boolean;
  @IsOptional() @IsBoolean() visible?: boolean;
  @IsOptional() @IsString() @MaxLength(10000) content?: string;
  @IsOptional() @IsString() fontFamily?: string;
  @IsOptional() @IsNumber() @Min(1) fontSize?: number;
  @IsOptional() @IsInt() fontWeight?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsIn(['left', 'center', 'right']) textAlign?: string;
  @IsOptional() @IsString() fill?: string;
  @IsOptional() @IsString() stroke?: string;
  @IsOptional() @IsNumber() strokeWidth?: number;
  @IsOptional() @IsNumber() @Min(0) borderRadius?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() iconName?: string;
}

export class CreateDesignDto {
  @IsString() @IsNotEmpty() @MaxLength(160) name!: string;
  @IsIn(['logo', 'flyer', 'banner', 'badge', 'business-card', 'poster', 'invitation', 'certificate', 'social', 'menu']) category!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsNumber() @Min(1) canvasWidth!: number;
  @IsNumber() @Min(1) canvasHeight!: number;
  @IsString() @IsNotEmpty() background!: string;
  @IsOptional() @IsString() backgroundImage?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DesignElementDto) elements?: DesignElementDto[];
}
