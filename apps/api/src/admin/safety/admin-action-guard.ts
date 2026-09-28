import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminActionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('No user');

    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    // Block super dangerous actions if not super admin
    if (req.body?.forceDelete && !user.isSuperAdmin) {
      throw new ForbiddenException('Super admin required');
    }

    return true;
  }
}