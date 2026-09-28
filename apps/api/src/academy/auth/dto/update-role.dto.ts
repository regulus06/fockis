import { IsIn } from "class-validator";

import type { AcademyRole } from "../schemas/academy-user.schema";

export class UpdateRoleDto {
  @IsIn([
    "student",
    "instructor",
    "advisor",
    "admissions",
    "employer",
    "staff",
    "administrator",
  ])
  role!: AcademyRole;
}