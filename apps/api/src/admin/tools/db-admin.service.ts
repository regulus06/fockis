import { Injectable } from '@nestjs/common';

@Injectable()
export class DbAdminService {
  async cleanupDatabase() {
    return { message: 'Database cleanup executed' };
  }

  async purgeDeleted() {
    return { message: 'Purged soft-deleted records' };
  }
}