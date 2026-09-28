import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_DOCUMENT_MIME = [...ALLOWED_IMAGE_MIME, 'application/pdf'];

export const MAX_UPLOAD_SIZE_BYTES = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 25) * 1024 * 1024;

export function imageUploadOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
      if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
        return cb(new BadRequestException(`Unsupported image type: ${file.mimetype}`), false);
      }
      cb(null, true);
    },
  };
}

export function documentUploadOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
      if (!ALLOWED_DOCUMENT_MIME.includes(file.mimetype)) {
        return cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      }
      cb(null, true);
    },
  };
}
