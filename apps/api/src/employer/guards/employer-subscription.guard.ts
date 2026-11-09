import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class EmployerSubscriptionGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // Fail closed until membership lookup and permission evaluation are implemented.
    throw new ForbiddenException('EmployerSubscriptionGuard is not configured. Access is denied.');
  }
}
