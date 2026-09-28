import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  diskStorage,
} from 'multer';

import {
  extname,
} from 'path';

import {
  randomUUID,
} from 'crypto';

import {
  UploadService,
} from './upload.service';

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (
          _req,
          file,
          callback,
        ) => {
          const extension =
            extname(
              file.originalname,
            );

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),

      limits: {
        fileSize:
          100 *
          1024 *
          1024,
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/avif',
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'video/x-matroska',
        ];

        if (
          !allowedTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              'Only image and video files are allowed.',
            ),
            false,
          );
        }

        callback(
          null,
          true,
        );
      },
    }),
  )
  async uploadFile(
    @UploadedFile()
    file: Express.Multer.File,

    @Query('context')
    context?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded.',
      );
    }

    const mimeType =
      file.mimetype?.toLowerCase() || '';

    /*
     * VIDEO
     * Routed through UploadService, which owns the
     * ffmpeg transcode/trim pipeline.
     */
    if (mimeType.startsWith('video/')) {
      const processed =
        await this.uploadService.processUpload(
          file,
          context,
        );

      return {
        success: true,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        type: 'video',
        media: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
      };
    }

    /*
     * IMAGE
     * Passes through unchanged.
     */
    return {
      success: true,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      type: 'image',
      media: `/uploads/${file.filename}`,
    };
  }
}