import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { hasMapManagementRole } from "./map.roles";

@Injectable()
export class MapManagementGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException("Authentication required.");

    const roles = Array.isArray(user.roles)
      ? user.roles
      : [user.role].filter(Boolean);

    if (roles.some((role: string) => hasMapManagementRole(role))) return true;

    throw new ForbiddenException("You do not have permission to manage Fockis addresses.");
  }
}
