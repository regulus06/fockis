import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWebsiteDto {
  @IsString() @Length(1, 120) name!: string;
  @IsIn(['template', 'scratch', 'import']) mode!: 'template' | 'scratch' | 'import';
  @IsOptional() @IsString() @MaxLength(80) templateSlug?: string;
  @IsOptional() @IsString() @MaxLength(80) categorySlug?: string;
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string;
  @IsOptional() @IsObject() importContent?: Record<string, any>;
}

export class UpdateWebsiteDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsString() @Length(1, 63) slug?: string;
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string | null;
}

export class SaveDraftDto {
  @IsObject() content!: Record<string, any>;
  @IsInt() @Min(0) revision!: number;
}

export class CreateVersionDto {
  @IsOptional() @IsString() @MaxLength(160) label?: string;
}

export class SwitchTemplateDto {
  @IsString() @Length(1, 80) templateSlug!: string;
}

export class AddDomainDto {
  @IsString() @Length(3, 253) domain!: string;
}

export class AddManagerDto {
  @IsString() @Length(1, 200) identifier!: string;
  @IsIn(['editor', 'admin']) role!: 'editor' | 'admin';
}

export class RegisterAssetDto {
  @IsString() @Length(1, 2000) url!: string;
  @IsOptional() @IsString() @MaxLength(255) filename?: string;
  @IsOptional() @IsString() @MaxLength(100) fileType?: string;
  @IsOptional() @IsNumber() size?: number;
  @IsOptional() @IsString() @MaxLength(80) folder?: string;
  @IsOptional() @IsString() @MaxLength(300) alt?: string;
}

export class UpdateAssetDto {
  @IsOptional() @IsString() @MaxLength(300) alt?: string;
  @IsOptional() @IsString() @MaxLength(80) folder?: string;
  @IsOptional() @IsString() @MaxLength(255) filename?: string;
}

export class UpdateOrderDto {
  @IsOptional() @IsString() @MaxLength(30) status?: string;
  @IsOptional() @IsString() @MaxLength(120) trackingNumber?: string;
}

export class UpdateSubmissionDto {
  @IsString() @MaxLength(30) status!: string;
}

export class SaveCouponsDto {
  @IsArray() coupons!: Record<string, any>[];
}

export class SaveSectionDto {
  @IsString() @Length(1, 120) name!: string;
  @IsObject() section!: Record<string, any>;
}

export class AiGenerateDto {
  @IsString() @Length(10, 4000) prompt!: string;
  @IsOptional() @IsString() @MaxLength(40) organizationId?: string;
}

export class AiAssistDto {
  @IsString() @Length(1, 40) websiteId!: string;
  @IsIn(['rewrite', 'improve-section', 'color-scheme', 'add-section', 'add-page', 'improve-mobile', 'product-descriptions', 'improve-seo', 'suggest-design']) action!: string;
  @IsOptional() @IsString() @MaxLength(64) sectionId?: string;
  @IsOptional() @IsString() @MaxLength(64) pageId?: string;
  @IsOptional() @IsString() @MaxLength(1000) instruction?: string;
  @IsObject() content!: Record<string, any>;
}

/* ---------------- public ---------------- */
export class PublicSubmissionDto {
  @IsString() @MaxLength(30) type!: string;
  @IsObject() data!: Record<string, any>;
}

export class QuoteDto {
  @IsArray() items!: Record<string, any>[];
  @IsOptional() @IsObject() fulfillment?: Record<string, any>;
  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
}

export class CheckoutDto extends QuoteDto {
  @IsObject() customer!: Record<string, any>;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() @MaxLength(2) country?: string;
}

export class ConfirmOrderDto {
  @IsString() @Length(1, 200) paymentIntentId!: string;
}

export class TrackViewDto {
  @IsOptional() @IsString() @MaxLength(300) path?: string;
}

export class ReportWebsiteDto {
  @IsString() @Length(5, 2000) reason!: string;
}

/* ---------------- admin ---------------- */
export class AdminCategoryDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(80) group?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(40) icon?: string;
  @IsOptional() @IsString() @MaxLength(2000) image?: string;
  @IsOptional() @IsIn(['active', 'hidden']) status?: 'active' | 'hidden';
}

export class ReorderDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}

export class AdminCreateTemplateDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsOptional() @IsString() @MaxLength(80) fromTemplateSlug?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class AdminUpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) thumbnail?: string;
  @IsOptional() @IsArray() previewImages?: string[];
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsArray() categoryIds?: string[];
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsIn(['free', 'premium']) accessLevel?: 'free' | 'premium';
  @IsOptional() @IsIn(['public', 'private']) visibility?: 'public' | 'private';
  @IsOptional() @IsIn(['draft', 'published', 'unpublished']) status?: 'draft' | 'published' | 'unpublished';
  @IsOptional() @IsNumber() order?: number;
}

export class SetDefaultDto {
  @IsString() @Length(1, 40) categoryId!: string;
}

export class SuspendDto {
  @IsBoolean() suspended!: boolean;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
