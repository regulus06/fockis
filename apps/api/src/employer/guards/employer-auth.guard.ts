import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Fail-closed placeholder.
 * Replace with the same JWT guard used by your existing Careers controllers.
 * Do not return true until req.user is populated and validated.
 */
@Injectable()
export class EmployerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.id && !request.user?._id && !request.user?.sub) {
      throw new UnauthorizedException('Authentication is required.');
    }
    return true;
  }
}
