import { SetMetadata } from "@nestjs/common";
import { Permission } from "./permissions.constants";

export const PERMISSIONS_KEY = "permissions";

/**
 * Attach one or more permissions to a controller or route.
 *
 * Example:
 *
 * @RequirePermissions(Permission.USERS_VIEW)
 */
export const RequirePermissions = (
  ...permissions: Permission[]
) =>
  SetMetadata(
    PERMISSIONS_KEY,
    permissions,
  );

/**
 * Alias used by newer admin controllers.
 *
 * This keeps compatibility with existing code that uses
 * @RequirePermissions(...) while allowing:
 *
 * @Permissions(...)
 */
export const Permissions = (
  ...permissions: Permission[]
) =>
  SetMetadata(
    PERMISSIONS_KEY,
    permissions,
  );