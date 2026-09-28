import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaCleanupService {
  async deleteOrphanMedia() {
    return { message: 'Orphan media cleaned' };
  }
}