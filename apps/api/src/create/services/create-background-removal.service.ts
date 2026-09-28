import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  BACKGROUND_REMOVAL_PROVIDER,
} from '../providers/background-removal/background-removal.interface';

import type {
  BackgroundRemovalProvider,
  BackgroundRemovalResult,
} from '../providers/background-removal/background-removal.interface';

import { StorageService } from '../utils/storage.service';

@Injectable()
export class CreateBackgroundRemovalService {
  constructor(
    @Inject(BACKGROUND_REMOVAL_PROVIDER)
    private readonly provider: BackgroundRemovalProvider,

    private readonly storage: StorageService,

    private readonly config: ConfigService,
  ) {}

  /**
   * Remove the background from an uploaded image.
   */
  async removeBackground(
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new InternalServerErrorException(
        'No image was provided',
      );
    }

    try {
      const imageBase64 =
        file.buffer.toString('base64');

      const result =
        await this.provider.removeBackground(
          imageBase64,
          file.mimetype,
        );

      const buffer =
        this.resultToBuffer(result);

      return {
        buffer,
        filename:
          this.createOutputFilename(
            file.originalname,
          ),
        mimeType: 'image/png',
      };
    } catch (error) {
      console.error(
        'Background removal failed:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to remove image background',
      );
    }
  }

  /**
   * Remove the background and save the
   * resulting image through StorageService.
   */
  async removeBackgroundAndSave(
    file: Express.Multer.File,
  ) {
    const result =
      await this.removeBackground(file);

    const saved =
      await this.storage.save(
        'background-removal',
        result.buffer,
        result.filename,
      );

    return {
      ...saved,
      filename: result.filename,
      mimeType: result.mimeType,
    };
  }

  /**
   * Process an image buffer directly.
   */
  async processBuffer(
    buffer: Buffer,
    filename = 'image.png',
    mimeType = 'image/png',
  ) {
    if (!buffer?.length) {
      throw new InternalServerErrorException(
        'Image buffer is empty',
      );
    }

    try {
      const imageBase64 =
        buffer.toString('base64');

      const result =
        await this.provider.removeBackground(
          imageBase64,
          mimeType,
        );

      const outputBuffer =
        this.resultToBuffer(result);

      return {
        buffer: outputBuffer,
        filename:
          this.createOutputFilename(
            filename,
          ),
        mimeType: 'image/png',
      };
    } catch (error) {
      console.error(
        'Background removal failed:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to remove image background',
      );
    }
  }

  /**
   * Process a buffer and save it to storage.
   */
  async processBufferAndSave(
    buffer: Buffer,
    filename = 'image.png',
    mimeType = 'image/png',
  ) {
    const result =
      await this.processBuffer(
        buffer,
        filename,
        mimeType,
      );

    const saved =
      await this.storage.save(
        'background-removal',
        result.buffer,
        result.filename,
      );

    return {
      ...saved,
      filename: result.filename,
      mimeType: result.mimeType,
    };
  }

  /**
   * Convert the provider result into a Buffer.
   */
  private resultToBuffer(
    result: BackgroundRemovalResult,
  ): Buffer {
    if (Buffer.isBuffer(result)) {
      return result;
    }

    if (typeof result === 'string') {
      return Buffer.from(
        result,
        'base64',
      );
    }

    if (
      result &&
      typeof result === 'object'
    ) {
      const value =
        result as unknown as Record<
          string,
          unknown
        >;

      /*
       * Direct Buffer result.
       */
      if (
        Buffer.isBuffer(
          value.buffer,
        )
      ) {
        return value.buffer;
      }

      /*
       * Base64 buffer property.
       */
      if (
        typeof value.buffer ===
        'string'
      ) {
        return Buffer.from(
          value.buffer,
          'base64',
        );
      }

      /*
       * Base64 result.
       */
      if (
        typeof value.base64 ===
        'string'
      ) {
        return Buffer.from(
          value.base64,
          'base64',
        );
      }

      /*
       * Base64 data.
       */
      if (
        typeof value.data ===
        'string'
      ) {
        return Buffer.from(
          value.data,
          'base64',
        );
      }

      /*
       * Base64 output.
       */
      if (
        typeof value.output ===
        'string'
      ) {
        return Buffer.from(
          value.output,
          'base64',
        );
      }

      /*
       * Buffer output.
       */
      if (
        Buffer.isBuffer(
          value.output,
        )
      ) {
        return value.output;
      }

      /*
       * Base64 result property.
       */
      if (
        typeof value.result ===
        'string'
      ) {
        return Buffer.from(
          value.result,
          'base64',
        );
      }

      /*
       * Buffer result property.
       */
      if (
        Buffer.isBuffer(
          value.result,
        )
      ) {
        return value.result;
      }

      /*
       * Common "image" property.
       */
      if (
        typeof value.image ===
        'string'
      ) {
        return Buffer.from(
          value.image,
          'base64',
        );
      }

      /*
       * Common "imageBuffer" property.
       */
      if (
        Buffer.isBuffer(
          value.imageBuffer,
        )
      ) {
        return value.imageBuffer;
      }

      /*
       * Common "imageBase64" property.
       */
      if (
        typeof value.imageBase64 ===
        'string'
      ) {
        return Buffer.from(
          value.imageBase64,
          'base64',
        );
      }
    }

    throw new Error(
      'Background removal provider returned an unsupported result format',
    );
  }

  /**
   * Generate a safe PNG output filename.
   */
  private createOutputFilename(
    originalFilename: string,
  ): string {
    const name =
      originalFilename
        .replace(
          /\.[^/.]+$/,
          '',
        )
        .replace(
          /[^a-zA-Z0-9_-]/g,
          '-',
        )
        .replace(
          /-+/g,
          '-',
        )
        .replace(
          /^-|-$/g,
          '',
        );

    return `${
      name || 'image'
    }-no-background.png`;
  }
}