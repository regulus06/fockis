/**
 * update-department.dto.ts
 * ---------------------------------------------------------------------------
 * PATCH payload for a Church Department.
 *
 * organizationId and departmentId come from the route.
 * createdByUserId, archive state, and archive metadata are NEVER client
 * controlled through this DTO.
 * ---------------------------------------------------------------------------
 */

import { PartialType } from "@nestjs/mapped-types";

import { CreateDepartmentDto } from "./create-department.dto";

export class UpdateDepartmentDto extends PartialType(
  CreateDepartmentDto,
) {}