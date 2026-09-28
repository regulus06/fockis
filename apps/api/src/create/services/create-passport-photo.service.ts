import { Injectable } from '@nestjs/common';
import { StorageService } from '../utils/storage.service';
import { PassportPhotoDto } from '../dto/passport-photo.dto';
import {
  resolvePassportSpec,
  specToPixels,
} from '../constants/passport-requirements';
import { InvalidScanException } from '../constants/errors';

@Injectable()
export class CreatePassportPhotoService {
  constructor(
    private readonly storage: StorageService,
  ) {}

  async process(
    file: Express.Multer.File,
    dto: PassportPhotoDto,
  ) {
    if (!file) {
      throw new InvalidScanException(
        'No file was uploaded',
      );
    }

    const spec = resolvePassportSpec(
      dto.country,
      dto.documentType,
    );

    const dimensions = specToPixels(spec);

    const targetWidth =
      dto.width !== undefined && dto.unit
        ? this.toPixels(dto.width, dto.unit)
        : dimensions.width;

    const targetHeight =
      dto.height !== undefined && dto.unit
        ? this.toPixels(dto.height, dto.unit)
        : dimensions.height;

    const background =
      dto.background || spec.background;

    try {
      const sharp = (await import('sharp')).default;

      const input = file.buffer || file.path;

      if (!input) {
        throw new Error(
          'Uploaded file has no readable data',
        );
      }

      const output =
        this.storage.resolveOutputPath(
          'photos',
          '.jpg',
        );

      await sharp(input)
        .resize(
          targetWidth,
          targetHeight,
          {
            fit: 'cover',
            position: 'attention',
          },
        )
        .flatten({
          background,
        })
        .jpeg({
          quality: 92,
          mozjpeg: true,
        })
        .toFile(output.path);

      return {
        url: output.url,
        path: output.path,

        spec: {
          country: spec.country,
          documentType: spec.documentType,

          width:
            dto.width ?? spec.width,

          height:
            dto.height ?? spec.height,

          unit:
            dto.unit ?? spec.unit,

          background,

          pixelDimensions: {
            width: targetWidth,
            height: targetHeight,
          },
        },
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unknown error';

      throw new InvalidScanException(
        `Failed to process passport photo: ${message}`,
      );
    }
  }

  private toPixels(
    value: number,
    unit: 'mm' | 'in' | 'px',
    dpi = 300,
  ): number {
    switch (unit) {
      case 'px':
        return Math.round(value);

      case 'in':
        return Math.round(value * dpi);

      case 'mm':
        return Math.round(
          (value / 25.4) * dpi,
        );

      default:
        return Math.round(value);
    }
  }
}