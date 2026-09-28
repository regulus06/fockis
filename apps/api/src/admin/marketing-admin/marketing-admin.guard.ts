import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class MarketingAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException("Authentication required.");

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === "SUPER_ADMIN" ||
      user.role === "super_admin" ||
      permissions.includes("*");

    if (isSuperAdmin) return true;

    if (
      !permissions.includes("marketing.view") &&
      !permissions.some((permission: unknown) =>
        typeof permission === "string" && permission.startsWith("marketing."),
      )
    ) {
      throw new ForbiddenException("Marketing Admin access is not permitted.");
    }

    return true;
  }
}

export function requireMarketingPermission(req: any, permission: string): void {
  const user = req?.user;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isSuperAdmin =
    user?.isSuperAdmin === true ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "super_admin" ||
    permissions.includes("*");

  if (isSuperAdmin) return;
  if (!permissions.includes(permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}
