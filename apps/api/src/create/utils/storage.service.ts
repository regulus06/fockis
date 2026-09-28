import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

/**
 * Minimal local-disk storage abstraction. Swap this out for an S3/GCS-backed
 * implementation later without touching the services that call it — they
 * only depend on this class's method signatures.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private readonly config: ConfigService) {
    this.root = this.config.get<string>('UPLOAD_ROOT', './uploads');
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  /** Saves a buffer under a subfolder (e.g. "scans", "assets") and returns its relative path. */
  async save(subfolder: string, buffer: Buffer, originalName: string): Promise<{ path: string; url: string }> {
    const dir = path.join(this.root, subfolder);
    await this.ensureDir(dir);

    const ext = path.extname(originalName) || '';
    const filename = `${uuid()}${ext}`;
    const fullPath = path.join(dir, filename);

    await fs.writeFile(fullPath, buffer);

    return { path: fullPath, url: `/uploads/${subfolder}/${filename}` };
  }

  async delete(fullPath: string) {
    await fs.unlink(fullPath).catch(() => undefined);
  }

  resolveOutputPath(subfolder: string, extension: string): { path: string; url: string } {
    const filename = `${uuid()}${extension}`;
    return {
      path: path.join(this.root, subfolder, filename),
      url: `/uploads/${subfolder}/${filename}`,
    };
  }

  async ensureSubfolder(subfolder: string) {
    await this.ensureDir(path.join(this.root, subfolder));
  }
}
