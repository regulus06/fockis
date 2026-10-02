import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import { PERMISSIONS_KEY } from "./permissions.decorator";
import { Permission } from "./permissions.enum";

import { ROLES_KEY } from "./roles.decorator";
import { Role } from "./roles.enum";

import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    // ========================================================================
    // 1. REQUEST
    // ========================================================================

    const request =
      context.switchToHttp().getRequest();

    const path =
      typeof request?.path === "string"
        ? request.path
        : typeof request?.url === "string"
          ? request.url.split("?")[0]
          : typeof request?.originalUrl === "string"
            ? request.originalUrl.split("?")[0]
            : "";

    // ========================================================================
    // 2. ACADEMY
    // ========================================================================
    //
    // Academy uses its own authentication and authorization.
    // ========================================================================

    if (
      path === "/academy" ||
      path.startsWith("/academy/")
    ) {
      return true;
    }

    // ========================================================================
    // 3. ROUTE METADATA
    // ========================================================================

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // ========================================================================
    // 4. PUBLIC ROUTE
    // ========================================================================
    //
    // A normal @Public() endpoint does not require authentication.
    //
    // However, if authorization metadata exists, the route must NOT be
    // silently converted into an unrestricted endpoint.
    // ========================================================================

    const hasAuthorizationMetadata =
      Boolean(
        requiredRoles &&
        requiredRoles.length > 0,
      ) ||
      Boolean(
        requiredPermissions &&
        requiredPermissions.length > 0,
      );

    if (
      isPublic &&
      !hasAuthorizationMetadata
    ) {
      return true;
    }

    // ========================================================================
    // 5. AUTHENTICATED USER REQUIRED
    // ========================================================================

    const user =
      request?.user;

    if (!user) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    // ========================================================================
    // 6. NORMALIZE ROLE
    // ========================================================================

    const userRole =
      this.normalizeRole(user.role);

    // ========================================================================
    // 7. SUPER ADMIN
    // ========================================================================
    //
    // Super Admin is determined from the authenticated user supplied by the
    // JWT strategy/database.
    //
    // The role remains the primary source.
    // The explicit isSuperAdmin flag is accepted when it is database-derived.
    // ========================================================================

    const isSuperAdmin =
      userRole === "super_admin" ||
      user.isSuperAdmin === true;

    if (isSuperAdmin) {
      return true;
    }

    // ========================================================================
    // 8. ROLE CHECK
    // ========================================================================

    if (
      requiredRoles &&
      requiredRoles.length > 0
    ) {
      const normalizedRequiredRoles =
        requiredRoles.map(
          (role) =>
            this.normalizeRole(role),
        );

      if (
        !normalizedRequiredRoles.includes(
          userRole,
        )
      ) {
        throw new ForbiddenException(
          "You do not have the required role.",
        );
      }
    }

    // ========================================================================
    // 9. PERMISSION CHECK
    // ========================================================================

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    // ========================================================================
    // 10. NORMALIZE USER PERMISSIONS
    // ========================================================================

    const userPermissions =
      this.normalizePermissions(
        user.permissions,
      );

    // ========================================================================
    // 11. REQUIRE ALL PERMISSIONS
    // ========================================================================

    const hasAllPermissions =
      requiredPermissions.every(
        (permission) =>
          userPermissions.includes(
            String(permission)
              .trim()
              .toLowerCase(),
          ),
      );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        "You do not have the required permission.",
      );
    }

    // ========================================================================
    // 12. ALLOW
    // ========================================================================

    return true;
  }

  // ==========================================================================
  // ROLE NORMALIZATION
  // ==========================================================================

  private normalizeRole(
    role: unknown,
  ): string {
    return String(
      role ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_",
      );
  }

  // ==========================================================================
  // PERMISSION NORMALIZATION
  // ==========================================================================

  private normalizePermissions(
    permissions: unknown,
  ): string[] {
    if (!Array.isArray(permissions)) {
      return [];
    }

    return Array.from(
      new Set(
        permissions
          .map(
            (permission) =>
              String(permission)
                .trim()
                .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );
  }
}