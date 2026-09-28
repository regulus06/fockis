/**
 * update-leader.dto.ts
 * Payload for PATCH /organizations/:organizationId/leadership/:leadershipId.
 */

import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { LeadershipRole } from '../schemas/leadership.schema';

export class UpdateLeaderDto {
  @IsOptional()
  @IsEnum(LeadershipRole)
  role?: LeadershipRole;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
