/**
 * create-church-group.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for POST /organizations/:organizationId/groups. Mirrors
 * web/src/features/church/types/church.types.ts -> CreateGroupInput
 * (organizationId itself comes from the route param, not the body).
 * -----------------------------------------------------------------------------
 */

import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { GroupType } from '../../enums/group-type.enum';

export class CreateChurchGroupDto {
  @IsString()
  name!: string;

  @IsEnum(GroupType)
  groupType!: GroupType;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leaderIds?: string[];

  @IsOptional()
  @IsString()
  meetingSchedule?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}