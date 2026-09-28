import { SetMetadata } from '@nestjs/common';

import { AcademyRole } from '../schemas/academy-user.schema';

export const ROLES_KEY = 'academy_roles';

/**
 * Usage:
 * @Roles('administrator', 'staff')
 */
export const Roles = (...roles: AcademyRole[]) =>
  SetMetadata(ROLES_KEY, roles);