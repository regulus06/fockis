import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    const user = req.user;

    const action = `${req.method} ${req.originalUrl || req.url}`;
    const ip =
      req.headers?.['x-forwarded-for']?.toString() ||
      req.ip;

    const userAgent = req.headers?.['user-agent'] || 'unknown';

    const body = req.body ?? null;
    const query = req.query ?? null;

    const baseLog = {
      userId: user?.id || null,
      action,
      module: 'admin',
      ip,
      userAgent,
    };

    return next.handle().pipe(
      tap(() => {
        this.audit.log({
          ...baseLog,
          metadata: {
            body,
            query,
            status: 'success',
          },
        });
      }),

      catchError((err) => {
        this.audit.log({
          ...baseLog,
          metadata: {
            body,
            query,
            status: 'failed',
            error: err?.message ?? 'Unknown error',
          },
        });

        return throwError(() => err);
      }),
    );
  }
}