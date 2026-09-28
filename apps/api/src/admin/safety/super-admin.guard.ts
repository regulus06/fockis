import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

interface AuthenticatedAdminUser {
  isSuperAdmin?: boolean;
  role?: string;
  roles?: string[];
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdminUser(
  user: AuthenticatedAdminUser,
): boolean {
  // Explicit database flag
  if (user.isSuperAdmin === true) {
    return true;
  }

  // Single role
  const role = normalizeRole(user.role);

  if (
    role === "super_admin" ||
    role === "superadmin"
  ) {
    return true;
  }

  // Multiple roles
  if (Array.isArray(user.roles)) {
    return user.roles.some((value) => {
      const normalized = normalizeRole(value);

      return (
        normalized === "super_admin" ||
        normalized === "superadmin"
      );
    });
  }

  return false;
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context
        .switchToHttp()
        .getRequest();

    const user =
      request.user as AuthenticatedAdminUser | undefined;

    if (!user) {
      throw new ForbiddenException(
        "Authentication required",
      );
    }

    if (!isSuperAdminUser(user)) {
      throw new ForbiddenException(
        "Super admin privileges required",
      );
    }

    return true;
  }
}

export default SuperAdminGuard;