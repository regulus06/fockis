import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

/** Body of save-draft / publish. `content` is checked field by field in the service. */
export class PageBrandingBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  resourceId?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

/** Body of restore / discard / reset. */
export class PageBrandingTargetDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  resourceId?: string;
}
