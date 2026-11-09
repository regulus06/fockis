/**
 * update-branch.dto.ts
 * Payload for PATCH /organizations/:organizationId/branches/:branchId.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
