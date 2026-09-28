import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";

// ============================================================================
// FOCKIS ACADEMY JWT AUTH GUARD
// ============================================================================

@Injectable()
export class AcademyJwtAuthGuard extends AuthGuard(
  "academy-jwt",
) {
  canActivate(
    context: ExecutionContext,
  ) {
    const request =
      context.switchToHttp().getRequest();

    const authorization =
      request.headers?.authorization;

    console.log(
      "[FOCKIS ACADEMY GUARD] Authorization header:",
      authorization
        ? `Bearer ${authorization
            .replace(/^Bearer\s+/i, "")
            .slice(0, 20)}...`
        : "MISSING",
    );

    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ) {
    if (err || !user) {
      console.error(
        "[FOCKIS ACADEMY GUARD] Authentication failed:",
        {
          error: err?.message,
          info:
            info?.message ||
            info?.name ||
            "Unknown authentication error",
        },
      );

      throw (
        err ||
        new UnauthorizedException(
          "Invalid or missing Academy authentication token.",
        )
      );
    }

    console.log(
      "[FOCKIS ACADEMY GUARD] User authenticated:",
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    );

    return user;
  }
}