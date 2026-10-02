import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

interface AdminActor {
  _id?: unknown;
  id?: unknown;
  role?: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class DbAdminService {
  /**
   * Database administration is intentionally restricted to SUPER_ADMIN.
   *
   * This service does NOT expose arbitrary MongoDB commands.
   * Any real cleanup/purge implementation should be added explicitly
   * and should never accept raw collection names, queries, or MongoDB
   * operators directly from an HTTP request.
   */
  private assertSuperAdmin(actor?: AdminActor): void {
    if (!actor) {
      throw new UnauthorizedException('Authentication required');
    }

    const role = String(actor.role ?? '').trim().toLowerCase();

    const isSuperAdmin =
      actor.isSuperAdmin === true || role === 'super_admin';

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only a Super Admin can perform database administration actions',
      );
    }
  }

  /**
   * Performs a controlled database cleanup.
   *
   * IMPORTANT:
   * This currently performs no destructive database operation.
   * Add specific cleanup operations here only after each collection
   * and retention policy has been explicitly defined.
   */
  async cleanupDatabase(actor?: AdminActor) {
    this.assertSuperAdmin(actor);

    return {
      success: true,
      message: 'Database cleanup authorization verified',
      executed: false,
      warning:
        'No destructive database operation is implemented in this service.',
    };
  }

  /**
   * Purges records that have been explicitly marked as soft-deleted.
   *
   * IMPORTANT:
   * This currently performs no deletion.
   * When implemented, deletion must be limited to explicitly approved
   * collections and records.
   */
  async purgeDeleted(actor?: AdminActor) {
    this.assertSuperAdmin(actor);

    return {
      success: true,
      message: 'Database purge authorization verified',
      executed: false,
      warning:
        'No records were permanently deleted because purge logic has not been implemented.',
    };
  }
}