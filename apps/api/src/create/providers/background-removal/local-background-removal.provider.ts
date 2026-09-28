import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BackgroundRemovalFailedException } from '../../constants/errors';
import {
  BackgroundRemovalOptions,
  BackgroundRemovalProvider,
  BackgroundRemovalResult,
} from './background-removal.interface';

const execAsync = promisify(exec);

/**
 * Local background removal backed by the `rembg` CLI (pip install rembg).
 * No external API key required. Produces a transparent-background PNG;
 * a solid replacement color/image is then composited on top if requested
 * by the caller (see BackgroundRemovalService).
 */
@Injectable()
export class LocalBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalBackgroundRemovalProvider.name);

  async removeBackground(
    inputPath: string,
    outputPath: string,
    _options?: BackgroundRemovalOptions,
  ): Promise<BackgroundRemovalResult> {
    try {
      await execAsync(`rembg i "${inputPath}" "${outputPath}"`, { timeout: 60_000 });
      return { outputPath, provider: this.name };
    } catch (err: any) {
      this.logger.error(`rembg failed: ${err.message}`);
      throw new BackgroundRemovalFailedException(
        'Local background removal engine (rembg) is unavailable or failed. Install rembg ' +
          '(pip install rembg), or set BACKGROUND_REMOVAL_PROVIDER=removebg with a valid API key.',
      );
    }
  }
}
