import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

interface AuthenticatedAdminUser {
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
    .replace(/[\s-]+/g, "_");
}

function isSuperAdminUser(
  user: AuthenticatedAdminUser,
): boolean {
  // ========================================================================
  // EXPLICIT SUPER ADMIN FLAG
  // ========================================================================

  if (
    user.isSuperAdmin === true
  ) {
    return true;
  }

  // ========================================================================
  // PRIMARY ROLE
  // ========================================================================

  const role =
    normalizeRole(user.role);

  if (
    role === "super_admin"
  ) {
    return true;
  }

  // ========================================================================
  // MULTIPLE ROLES
  // ========================================================================

  if (
    Array.isArray(user.roles)
  ) {
    return user.roles.some(
      (value) =>
        normalizeRole(value) ===
        "super_admin",
    );
  }

  return false;
}

@Injectable()
export class SuperAdminGuard
  implements CanActivate
{
  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context
        .switchToHttp()
        .getRequest();

    const user =
      request?.user as
        | AuthenticatedAdminUser
        | undefined;

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================

    if (!user) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    // ========================================================================
    // SUPER ADMIN AUTHORIZATION
    // ========================================================================

    if (
      !isSuperAdminUser(user)
    ) {
      throw new ForbiddenException(
        "Super admin privileges required.",
      );
    }

    return true;
  }
}

export default SuperAdminGuard;