import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from './permissions.decorator';
import { Permission } from './permissions.constants';

import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class RbacGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {

    // ========================================================================
    // 1. PUBLIC ROUTE CHECK
    // ========================================================================

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (isPublic) {
      return true;
    }

    // ========================================================================
    // 2. REQUEST
    // ========================================================================

    const request =
      context.switchToHttp().getRequest();

    const path =
      request?.path ||
      request?.url ||
      request?.originalUrl ||
      '';

    // ========================================================================
    // 3. ACADEMY BYPASS
    // ========================================================================
    //
    // Academy has its own authentication / authorization system:
    //
    //   AcademyJwtAuthGuard
    //   academy-jwt Passport strategy
    //   Academy RolesGuard
    //
    // The global Fockis RBAC guard must not evaluate Academy routes.
    //
    // Public Academy routes:
    //
    //   GET /academy/content/admissions-steps
    //   GET /academy/content/admissions-faq
    //
    // Protected Academy routes explicitly use:
    //
    //   @UseGuards(AcademyJwtAuthGuard, RolesGuard)
    //
    // ========================================================================

    if (
      typeof path === 'string' &&
      (
        path === '/academy' ||
        path.startsWith('/academy/')
      )
    ) {
      return true;
    }

    // ========================================================================
    // 4. USER MUST EXIST
    // ========================================================================

    const user =
      request.user;

    if (!user) {
      return false;
    }

    // ========================================================================
    // 5. ROLE CHECK
    // ========================================================================

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      requiredRoles &&
      requiredRoles.length > 0
    ) {

      if (
        !requiredRoles.includes(user.role)
      ) {
        return false;
      }

    }

    // ========================================================================
    // 6. PERMISSION CHECK
    // ========================================================================

    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      requiredPermissions &&
      requiredPermissions.length > 0
    ) {

      if (
        !Array.isArray(user.permissions)
      ) {
        return false;
      }

      const hasPermissions =
        requiredPermissions.every(
          (permission) =>
            user.permissions.includes(permission),
        );

      if (!hasPermissions) {
        return false;
      }

    }

    // ========================================================================
    // 7. ALLOW
    // ========================================================================

    return true;
  }
}