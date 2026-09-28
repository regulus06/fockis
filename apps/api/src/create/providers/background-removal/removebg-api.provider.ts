import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { BackgroundRemovalFailedException } from '../../constants/errors';
import {
  BackgroundRemovalOptions,
  BackgroundRemovalProvider,
  BackgroundRemovalResult,
} from './background-removal.interface';

@Injectable()
export class RemoveBgApiProvider implements BackgroundRemovalProvider {
  readonly name = 'removebg';
  private readonly logger = new Logger(RemoveBgApiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async removeBackground(
    inputPath: string,
    outputPath: string,
    options?: BackgroundRemovalOptions,
  ): Promise<BackgroundRemovalResult> {
    const apiKey = this.config.get<string>('REMOVE_BG_API_KEY');
    if (!apiKey) {
      throw new BackgroundRemovalFailedException('REMOVE_BG_API_KEY is not configured');
    }

    const imageBuffer = await fs.readFile(inputPath);
    const form = new FormData();
    form.append('image_file', new Blob([imageBuffer]), 'image.png');
    form.append('size', 'auto');
    if (options?.replacementColor) {
      form.append('bg_color', options.replacementColor.replace('#', ''));
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form as any,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`remove.bg error: ${body}`);
      throw new BackgroundRemovalFailedException('remove.bg request failed');
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

    return { outputPath, provider: this.name };
  }
}
