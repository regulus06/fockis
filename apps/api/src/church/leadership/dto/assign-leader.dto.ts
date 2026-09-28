/**
 * assign-leader.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for POST /organizations/:organizationId/leadership — assigns a
 * member (identified by an existing membership) to a leadership role.
 * -----------------------------------------------------------------------------
 */

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadershipRole } from '../schemas/leadership.schema';

export class AssignLeaderDto {
  /** The Membership record id of the user being assigned to leadership. */
  @IsString()
  memberId!: string;

  @IsEnum(LeadershipRole)
  role!: LeadershipRole;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}