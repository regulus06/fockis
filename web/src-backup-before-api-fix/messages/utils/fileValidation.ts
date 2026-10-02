import type { AttachmentKind } from '../types';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

export interface FileValidationResult {
  valid: boolean;
  kind?: AttachmentKind;
  error?: string;
}

export function classifyAndValidateFile(file: File): FileValidationResult {
  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) return { valid: false, error: 'Image is larger than 25MB' };
    return { valid: true, kind: 'image' };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) return { valid: false, error: 'Video is larger than 200MB' };
    return { valid: true, kind: 'video' };
  }
  if (DOCUMENT_TYPES.includes(file.type) || /\.(docx?|xlsx?|pptx?|pdf|txt|csv)$/i.test(file.name)) {
    if (file.size > MAX_DOCUMENT_SIZE) return { valid: false, error: 'File is larger than 50MB' };
    return { valid: true, kind: 'document' };
  }
  return { valid: false, error: 'Unsupported file type' };
}
