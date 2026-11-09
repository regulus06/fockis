/**
 * update-member.dto.ts
 * Payload for PATCH /organizations/:organizationId/members/:memberId —
 * updates public and/or private profile fields. Role and status changes go
 * through their own dedicated endpoints/DTOs (update-member-role.dto.ts and
 * the inline status DTO in members.controller.ts) so permission checks stay
 * narrow and explicit per action.
 */

import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class UpdateMemberAddressDto {
  @IsOptional() @IsString() line1?: string;
  @IsOptional() @IsString() line2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
}

class UpdateMemberPrivateProfileDto {
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMemberAddressDto)
  address?: UpdateMemberAddressDto;

  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMemberProfileDto)
  profile?: UpdateMemberProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMemberPrivateProfileDto)
  privateProfile?: UpdateMemberPrivateProfileDto;
}
