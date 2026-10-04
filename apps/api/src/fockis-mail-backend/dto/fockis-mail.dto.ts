import {



  ArrayMaxSize,



  ArrayMinSize,



  IsArray,



  IsBoolean,



  IsEmail,



  IsEnum,



  IsInt,



  IsNumber,



  IsObject,



  IsOptional,



  IsString,



  Max,



  Min,



  ValidateNested,



} from 'class-validator';







import { Type, Transform } from 'class-transformer';







import {



  CampaignStatus,



  CampaignType,



  ContactStatus,



  AutomationStatus,



  JourneyStatus,



} from '../enums/fockis-mail.enums';







/* ============================================================================



 * HELPERS



 * ========================================================================== */







/**



 * The Fockis frontend uses lowercase contact statuses:



 *



 * subscribed



 * unsubscribed



 * cleaned



 * pending



 *



 * The backend enum uses uppercase values.



 */



function normalizeContactStatus(value: unknown): unknown {



  if (typeof value !== 'string') {



    return value;



  }







  return value.trim().toUpperCase();



}







/* ============================================================================



 * CAMPAIGNS



 * ========================================================================== */







export class CreateCampaignDto {



  /**



   * Campaign name.



   */



  @IsString()



  name: string;







  /**



   * Optional internal campaign description.



   */



  @IsOptional()



  @IsString()



  description?: string;







  /**



   * Campaign type.



   */



  @IsOptional()



  @IsEnum(CampaignType)



  type?: CampaignType;







  /**



   * Campaign status.



   */



  @IsOptional()



  @IsEnum(CampaignStatus)



  status?: CampaignStatus;







  /**



   * Sender display name.



   */



  @IsOptional()



  @IsString()



  fromName?: string;







  /**



   * Sender email address.



   */



  @IsOptional()



  @IsEmail()



  fromEmail?: string;







  /**



   * Reply-to email address.



   */



  @IsOptional()



  @IsEmail()



  replyTo?: string;







  /**



   * Email subject.



   */



  @IsOptional()



  @IsString()



  subject?: string;







  /**



   * Inbox preview text.



   */



  @IsOptional()



  @IsString()



  previewText?: string;







  /**



   * EmailBuilder document.



   *



   * The EmailCampaignComposer stores the complete



   * visual email editor document here.



   */



  @IsOptional()



  @IsObject()



  content?: Record<string, any>;







  /**



   * Legacy/generated HTML email.



   */



  @IsOptional()



  @IsString()



  html?: string;







  /**



   * Legacy email blocks.



   */



  @IsOptional()



  @IsArray()



  blocks?: any[];







  /**



   * Primary audience selected in the composer.



   */



  @IsOptional()



  @IsString()



  audienceId?: string;







  /**



   * Multiple audience IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  audienceIds?: string[];







  /**



   * Primary segment selected in the composer.



   */



  @IsOptional()



  @IsString()



  segmentId?: string;







  /**



   * Multiple segment IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  segmentIds?: string[];







  /**



   * Marketing tag IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tagIds?: string[];







  /**



   * Fockis behavioral/activity filters.



   *



   * Kept flexible because different behavior filters



   * can have different structures.



   */



  @IsOptional()



  @IsArray()



  fockisFilters?: any[];







  /**



   * Existing direct-recipient support.



   *



   * These are email addresses that are resolved into



   * Contact ObjectIds by CampaignsService.



   */



  @IsOptional()



  @IsArray()



  @IsEmail({}, { each: true })



  recipients?: string[];







  /**



   * Optional scheduled delivery time.



   */



  @IsOptional()



  @Type(() => Date)



  scheduledAt?: Date;



}











export class UpdateCampaignDto {



  /**



   * Campaign name.



   */



  @IsOptional()



  @IsString()



  name?: string;







  /**



   * Internal campaign description.



   */



  @IsOptional()



  @IsString()



  description?: string;







  /**



   * Campaign type.



   */



  @IsOptional()



  @IsEnum(CampaignType)



  type?: CampaignType;







  /**



   * Campaign status.



   */



  @IsOptional()



  @IsEnum(CampaignStatus)



  status?: CampaignStatus;







  /**



   * Sender display name.



   */



  @IsOptional()



  @IsString()



  fromName?: string;







  /**



   * Sender email address.



   */



  @IsOptional()



  @IsEmail()



  fromEmail?: string;







  /**



   * Reply-to email address.



   */



  @IsOptional()



  @IsEmail()



  replyTo?: string;







  /**



   * Email subject.



   */



  @IsOptional()



  @IsString()



  subject?: string;







  /**



   * Inbox preview text.



   */



  @IsOptional()



  @IsString()



  previewText?: string;







  /**



   * EmailBuilder document.



   *



   * EmailBuilder saves campaigns using:



   *



   * {



   *   content



   * }



   */



  @IsOptional()



  @IsObject()



  content?: Record<string, any>;







  /**



   * Legacy/generated HTML email.



   */



  @IsOptional()



  @IsString()



  html?: string;







  /**



   * Legacy email blocks.



   */



  @IsOptional()



  @IsArray()



  blocks?: any[];







  /**



   * Primary audience.



   */



  @IsOptional()



  @IsString()



  audienceId?: string;







  /**



   * Multiple audience IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  audienceIds?: string[];







  /**



   * Primary segment.



   */



  @IsOptional()



  @IsString()



  segmentId?: string;







  /**



   * Multiple segment IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  segmentIds?: string[];







  /**



   * Marketing tag IDs.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tagIds?: string[];







  /**



   * Fockis behavioral/activity filters.



   */



  @IsOptional()



  @IsArray()



  fockisFilters?: any[];







  /**



   * Existing direct-recipient support.



   */



  @IsOptional()



  @IsArray()



  @IsEmail({}, { each: true })



  recipients?: string[];







  /**



   * Optional scheduled delivery time.



   */



  @IsOptional()



  @Type(() => Date)



  scheduledAt?: Date;



}











/**



 * Schedule Campaign



 *



 * POST /fockis-mail/campaigns/:id/schedule



 */



export class ScheduleCampaignDto {



  @Type(() => Date)



  scheduledAt: Date;



}











/* ============================================================================



 * CONTACTS



 * ========================================================================== */







export class CreateContactDto {



  /**



   * Contact email.



   */



  @IsEmail()



  email: string;







  /**



   * First name.



   */



  @IsOptional()



  @IsString()



  firstName?: string;







  /**



   * Last name.



   */



  @IsOptional()



  @IsString()



  lastName?: string;







  /**



   * Phone number.



   */



  @IsOptional()



  @IsString()



  phone?: string;







  /**



   * Contact location.



   */



  @IsOptional()



  @IsString()



  location?: string;







  /**



   * Contact subscription status.



   */



  @IsOptional()



  @Transform(({ value }) => normalizeContactStatus(value))



  @IsEnum(ContactStatus)



  status?: ContactStatus;







  /**



   * Legacy/backend tag representation.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tags?: string[];







  /**



   * Fockis frontend tag representation.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tagIds?: string[];







  /**



   * Optional single audience assignment.



   */



  @IsOptional()



  @IsString()



  audienceId?: string;







  /**



   * Multiple audience assignments.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  audienceIds?: string[];







  /**



   * Custom contact fields.



   */



  @IsOptional()



  @IsObject()



  customFields?: Record<string, any>;







  /**



   * Revenue associated with the contact.



   */



  @IsOptional()



  @IsNumber()



  @Min(0)



  revenue?: number;







  /**



   * Number of orders associated with the contact.



   */



  @IsOptional()



  @IsInt()



  @Min(0)



  orderCount?: number;







  /**



   * VIP flag.



   */



  @IsOptional()



  @IsBoolean()



  vip?: boolean;



}











export class UpdateContactDto {



  /**



   * Contact email.



   */



  @IsOptional()



  @IsEmail()



  email?: string;







  /**



   * First name.



   */



  @IsOptional()



  @IsString()



  firstName?: string;







  /**



   * Last name.



   */



  @IsOptional()



  @IsString()



  lastName?: string;







  /**



   * Phone number.



   */



  @IsOptional()



  @IsString()



  phone?: string;







  /**



   * Location.



   */



  @IsOptional()



  @IsString()



  location?: string;







  /**



   * Contact status.



   */



  @IsOptional()



  @Transform(({ value }) => normalizeContactStatus(value))



  @IsEnum(ContactStatus)



  status?: ContactStatus;







  /**



   * Legacy/backend tag representation.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tags?: string[];







  /**



   * Fockis frontend tag representation.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  tagIds?: string[];







  /**



   * Single audience assignment.



   */



  @IsOptional()



  @IsString()



  audienceId?: string;







  /**



   * Multiple audience assignments.



   */



  @IsOptional()



  @IsArray()



  @IsString({ each: true })



  audienceIds?: string[];







  /**



   * Custom fields.



   */



  @IsOptional()



  @IsObject()



  customFields?: Record<string, any>;







  /**



   * Revenue.



   */



  @IsOptional()



  @IsNumber()



  @Min(0)



  revenue?: number;







  /**



   * Order count.



   */



  @IsOptional()



  @IsInt()



  @Min(0)



  orderCount?: number;







  /**



   * VIP flag.



   */



  @IsOptional()



  @IsBoolean()



  vip?: boolean;



}













/* ============================================================================

 * FOCKIS MAIL — FORMS

 * ========================================================================== */



export class SignupFormFieldDto {

  @IsString()

  id: string;



  @IsString()

  @IsEnum([

    'first_name',

    'last_name',

    'email',

    'phone',

    'birthday',

    'address',

    'custom',

    'checkbox',

    'dropdown',

    'radio',

    'consent',

  ])

  type: string;



  @IsString()

  label: string;



  @IsOptional()

  @IsString()

  placeholder?: string;



  @IsBoolean()

  required: boolean;



  @IsArray()

  @IsString({ each: true })

  options: string[];

}



export class CreateSignupFormDto {

  @IsString()

  name: string;



  @IsString()

  audienceId: string;

}



export class UpdateSignupFormDto {

  @IsOptional()

  @IsString()

  name?: string;



  @IsOptional()

  @IsString()

  audienceId?: string;



  @IsOptional()

  @IsEnum(['embed', 'popup', 'inline', 'landing'])

  display?: string;



  @IsOptional()

  @IsString()

  title?: string;



  @IsOptional()

  @IsString()

  description?: string;



  @IsOptional()

  @IsString()

  submitLabel?: string;



  @IsOptional()

  @IsArray()

  @ValidateNested({ each: true })

  @Type(() => SignupFormFieldDto)

  fields?: SignupFormFieldDto[];



  @IsOptional()

  @IsInt()

  @Min(0)

  submissions?: number;



  @IsOptional()

  @IsNumber()

  @Min(0)

  conversionRate?: number;

}



/* ============================================================================

 * TEMPLATES

 * ========================================================================== */









export class CreateTemplateDto {



  @IsString()



  name: string;







  @IsOptional()



  @IsString()



  type?: string;







  @IsOptional()



  @IsString()



  subject?: string;







  @IsOptional()



  @IsString()



  html?: string;







  @IsOptional()



  @IsArray()



  blocks?: any[];







  @IsOptional()



  @IsString()



  thumbnailUrl?: string;



}











/* ============================================================================



 * AUTOMATIONS



 * ========================================================================== */







export class CreateAutomationDto {



  @IsString()



  name: string;







  @IsOptional()



  @IsEnum(AutomationStatus)



  status?: AutomationStatus;







  @IsOptional()



  @IsString()



  trigger?: string;







  @IsOptional()



  @IsArray()



  nodes?: any[];







  @IsOptional()



  @IsArray()



  edges?: any[];



}











/* ============================================================================



 * JOURNEYS



 * ========================================================================== */







export class CreateJourneyDto {



  @IsString()



  name: string;







  @IsOptional()



  @IsEnum(JourneyStatus)



  status?: JourneyStatus;







  @IsOptional()



  @IsArray()



  nodes?: any[];







  @IsOptional()



  @IsArray()



  edges?: any[];



}











/* ============================================================================



 * WORKSPACES



 * ========================================================================== */







export class CreateWorkspaceDto {



  @IsString()



  name: string;







  @IsOptional()



  @IsString()



  brandName?: string;







  @IsOptional()



  @IsString()



  logoUrl?: string;







  @IsOptional()



  @IsString()



  timezone?: string;







  @IsOptional()



  @IsString()



  currency?: string;



}











/* ============================================================================



 * BILLING



 * ========================================================================== */







export class PurchaseCreditsDto {



  @IsInt()



  @Min(1)



  credits: number;







  @IsOptional()



  @IsString()



  paymentMethodId?: string;



}











/* ============================================================================



 * FOCKIS MAIL — A/B TESTING



 * ========================================================================== */







export class ABVariantDto {



  @IsEnum(['A', 'B'])



  key: 'A' | 'B';







  @IsString()



  label: string;







  @IsString()



  value: string;







  @IsInt()



  @Min(0)



  recipients: number;







  @IsNumber()



  @Min(0)



  openRate: number;







  @IsNumber()



  @Min(0)



  clickRate: number;







  @IsNumber()



  @Min(0)



  conversionRate: number;







  @IsNumber()



  @Min(0)



  revenue: number;



}











export class CreateAbTestDto {



  @IsString()



  name: string;







  @IsEnum([



    'subject',



    'from_name',



    'send_time',



    'content',



  ])



  variable:



    | 'subject'



    | 'from_name'



    | 'send_time'



    | 'content';







  @IsInt()



  @Min(1)



  @Max(100)



  testSizePct: number;







  @IsEnum([



    'open_rate',



    'click_rate',



    'conversion_rate',



    'revenue',



  ])



  winnerMetric:



    | 'open_rate'



    | 'click_rate'



    | 'conversion_rate'



    | 'revenue';







  @IsArray()



  @ArrayMinSize(2)



  @ArrayMaxSize(2)



  @ValidateNested({ each: true })



  @Type(() => ABVariantDto)



  variants: ABVariantDto[];







  @IsOptional()



  @IsEnum(['draft', 'running', 'completed'])



  status?: 'draft' | 'running' | 'completed';







  @IsOptional()



  @IsEnum(['A', 'B'])



  declaredWinner?: 'A' | 'B';







  @IsOptional()



  @Type(() => Date)



  startedAt?: Date;



}











export class UpdateAbTestDto {



  @IsOptional()



  @IsString()



  name?: string;







  @IsOptional()



  @IsEnum([



    'subject',



    'from_name',



    'send_time',



    'content',



  ])



  variable?:



    | 'subject'



    | 'from_name'



    | 'send_time'



    | 'content';







  @IsOptional()



  @IsEnum(['draft', 'running', 'completed'])



  status?: 'draft' | 'running' | 'completed';







  @IsOptional()



  @IsInt()



  @Min(1)



  @Max(100)



  testSizePct?: number;







  @IsOptional()



  @IsEnum([



    'open_rate',



    'click_rate',



    'conversion_rate',



    'revenue',



  ])



  winnerMetric?:



    | 'open_rate'



    | 'click_rate'



    | 'conversion_rate'



    | 'revenue';







  @IsOptional()



  @IsArray()



  @ArrayMinSize(2)



  @ArrayMaxSize(2)



  @ValidateNested({ each: true })



  @Type(() => ABVariantDto)



  variants?: ABVariantDto[];







  @IsOptional()



  @IsEnum(['A', 'B'])



  declaredWinner?: 'A' | 'B';







  @IsOptional()



  @Type(() => Date)



  startedAt?: Date;



}
