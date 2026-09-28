import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestUser {
  userId: string;
  username: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  return req.user;
});