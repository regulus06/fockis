import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Like AcademyJwtAuthGuard, but lets anonymous visitors through with
 * req.user = null (public course pages that show more to enrolled learners).
 */
@Injectable()
export class OptionalAcademyAuthGuard extends AuthGuard("academy-jwt") {
  handleRequest<T>(_err: unknown, user: T): T {
    return (user || null) as T;
  }
}
