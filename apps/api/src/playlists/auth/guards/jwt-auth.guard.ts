import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  [key: string]: unknown;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader =
      request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing authentication token',
      );
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      throw new UnauthorizedException(
        'Missing authentication token',
      );
    }

    try {
      const payload =
        this.jwtService.verify<AuthenticatedUser>(token);

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader =
      request.headers.authorization;

    // No token is allowed for public endpoints.
    if (!authHeader?.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return true;
    }

    try {
      const payload =
        this.jwtService.verify<AuthenticatedUser>(token);

      request.user = payload;
    } catch {
      // Optional authentication:
      // continue as an anonymous user.
    }

    return true;
  }
}