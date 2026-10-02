import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateAdminRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /**
   * Optional.
   *
   * If omitted, the backend generates the slug
   * from the role name.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}