/**
 * update-member-role.dto.ts
 * Payload for PATCH /organizations/:organizationId/members/:memberId/role.
 * Kept separate from update-member.dto.ts because role changes carry
 * different authorization requirements (only Administrator/Pastor-Director
 * may promote/demote another member).
 */

import { IsEnum } from "class-validator";
import { MemberRole } from "../../enums/member-role.enum";

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role!: MemberRole;
}