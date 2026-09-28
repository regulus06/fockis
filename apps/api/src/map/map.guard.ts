import {
CanActivate,
ExecutionContext,
ForbiddenException,
Injectable,
UnauthorizedException,
SetMetadata,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import {
MAP_ADDRESS_MANAGEMENT_PERMISSIONS,
MAP_UNIT_MANAGEMENT_PERMISSIONS,
MapPermission as MapPermissionType,
} from "./map.permissions";

import {
hasMapManagementRole,
} from "./map.roles";

export const MAP_PERMISSION_KEY =
"map_permission";

/**

* Decorator used by Map controller routes.
*
* Example:
* @MapPermission("map.address.read")
  */
  export const MapPermission = (
  permission: MapPermissionType,
  ) =>
  SetMetadata(
  MAP_PERMISSION_KEY,
  permission,
  );

interface MapRequestUser {
id?: string;
userId?: string;
sub?: string;
role?: string;
permissions?: string[];
isSuperAdmin?: boolean;
}

/**

* Fockis Map permission guard.
*
* Authentication is expected to have already happened
* through AuthGuard("jwt").
*
* Super admins are allowed through automatically.
*
* Otherwise, the user must have the permission declared
* on the route through @MapPermission(...).
  */
  @Injectable()
  export class MapPermissionGuard
  implements CanActivate
  {
  constructor(
  private readonly reflector: Reflector,
  ) {}

canActivate(
context: ExecutionContext,
): boolean {
const request =
context
.switchToHttp()
.getRequest();
const user =
  request.user as
    | MapRequestUser
    | undefined;

if (!user) {
  throw new UnauthorizedException(
    "Authentication required.",
  );
}

/**
 * Preserve the explicit JWT super-admin flag.
 */
if (user.isSuperAdmin === true) {
  return true;
}

/**
 * Preserve the role-based Map management
 * compatibility used by the existing Map architecture.
 */
if (
  hasMapManagementRole(
    user.role,
  )
) {
  return true;
}

const permission =
  this.reflector.getAllAndOverride<
    MapPermissionType | undefined
  >(
    MAP_PERMISSION_KEY,
    [
      context.getHandler(),
      context.getClass(),
    ],
  );

/**
 * If the route does not require a specific
 * Map permission, allow it to continue.
 */
if (!permission) {
  return true;
}

const permissions =
  Array.isArray(
    user.permissions,
  )
    ? user.permissions
    : [];

if (
  permissions.includes(
    permission,
  )
) {
  return true;
}

throw new ForbiddenException(
  `You do not have the required Fockis Map permission: ${permission}`,
);
}
}

/**

* Fockis Map management compatibility guard.
*
* This guard preserves the existing role/permission
* based management architecture for address and unit
* management routes.
  */
  @Injectable()
  export class MapManagementGuard
  implements CanActivate
  {
  constructor(
  private readonly reflector: Reflector,
  ) {}

canActivate(
context: ExecutionContext,
): boolean {
const request =
context
.switchToHttp()
.getRequest();
const user =
  request.user as
    | MapRequestUser
    | undefined;

if (!user) {
  throw new UnauthorizedException(
    "Authentication required.",
  );
}

/**
 * Explicit super-admin flag.
 */
if (user.isSuperAdmin === true) {
  return true;
}

/**
 * Preserve the existing Map management roles:
 *
 * super_admin
 * SUPER_ADMIN
 * admin
 * MAP_ADMIN
 * ADDRESS_ADMIN
 * ADDRESS_MANAGER
 * REGIONAL_MANAGER
 * BUILDING_MANAGER
 */
if (
  hasMapManagementRole(
    user.role,
  )
) {
  return true;
}

const permissions =
  new Set(
    Array.isArray(
      user.permissions,
    )
      ? user.permissions
      : [],
  );

const handler =
  context
    .getHandler()
    .name;

/**
 * Address management routes.
 */
if (
  handler === "create" ||
  handler === "update" ||
  handler === "deactivate"
) {
  for (
    const permission of
      MAP_ADDRESS_MANAGEMENT_PERMISSIONS
  ) {
    if (
      permissions.has(
        permission,
      )
    ) {
      return true;
    }
  }
}

/**
 * Unit management routes.
 */
if (
  handler === "addUnit" ||
  handler === "updateUnit"
) {
  for (
    const permission of
      MAP_UNIT_MANAGEMENT_PERMISSIONS
  ) {
    if (
      permissions.has(
        permission,
      )
    ) {
      return true;
    }
  }
}

/**
 * Also honor an explicit @MapPermission(...)
 * decorator on the handler or controller.
 */
const requiredPermission =
  this.reflector.getAllAndOverride<
    MapPermissionType | undefined
  >(
    MAP_PERMISSION_KEY,
    [
      context.getHandler(),
      context.getClass(),
    ],
  );

if (
  requiredPermission &&
  permissions.has(
    requiredPermission,
  )
) {
  return true;
}

throw new ForbiddenException(
  "You do not have permission to manage Fockis Map.",
);
}
}
