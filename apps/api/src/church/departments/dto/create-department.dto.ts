/**
 * create-department.dto.ts
 * ---------------------------------------------------------------------------
 * Payload for:
 *
 * POST /organizations/:organizationId/departments
 *
 * organizationId comes from the route and MUST NOT be accepted from the
 * request body.
 *
 * createdByUserId is also NOT accepted from the client.
 * The backend gets the authenticated user ID from JWT authentication.
 * ---------------------------------------------------------------------------
 */

import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import { DepartmentType } from "../../enums/department-type.enum";

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsEnum(DepartmentType)
  departmentType!: DepartmentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leaderIds?: string[];
}