import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

export const REQUIRES_SUPER_ADMIN_KEY =
  "requires_super_admin";

interface DestructiveUser {
  isSuperAdmin?: boolean;
  role?: string;
  roles?: string[];
}

function normalizeRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_",
    );
}

function isSuperAdmin(
  user: DestructiveUser,
): boolean {
  // Explicit database-derived flag.
  if (
    user.isSuperAdmin === true
  ) {
    return true;
  }

  // Primary role.
  if (
    normalizeRole(user.role) ===
    "super_admin"
  ) {
    return true;
  }

  // Multiple roles, if supported.
  if (
    Array.isArray(user.roles)
  ) {
    return user.roles.some(
      (role) =>
        normalizeRole(role) ===
        "super_admin",
    );
  }

  return false;
}

@Injectable()
export class DestructiveGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    // ========================================================================
    // 1. CHECK SUPER-ADMIN REQUIREMENT FIRST
    // ========================================================================

    const requiresSuperAdmin =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRES_SUPER_ADMIN_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // Normal route; no destructive-action restriction.
    if (!requiresSuperAdmin) {
      return true;
    }

    // ========================================================================
    // 2. PUBLIC ROUTES CANNOT BYPASS SUPER-ADMIN REQUIREMENT
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
      throw new ForbiddenException(
        "A destructive super-admin action cannot be public.",
      );
    }

    // ========================================================================
    // 3. REQUEST USER
    // ========================================================================

    const request =
      context
        .switchToHttp()
        .getRequest();

    const user =
      request?.user as
        | DestructiveUser
        | undefined;

    if (!user) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    // ========================================================================
    // 4. SUPER ADMIN REQUIRED
    // ========================================================================

    if (!isSuperAdmin(user)) {
      throw new ForbiddenException(
        "Destructive action requires super admin privileges.",
      );
    }

    // ========================================================================
    // 5. ALLOW
    // ========================================================================

    return true;
  }
}