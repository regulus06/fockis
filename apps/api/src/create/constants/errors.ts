import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class TemplateNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Template${id ? ` ${id}` : ''} not found`);
  }
}

export class TemplateInactiveException extends BadRequestException {
  constructor() {
    super('Template is not active');
  }
}

export class InvalidTemplateException extends BadRequestException {
  constructor(message = 'Invalid template data') {
    super(message);
  }
}

export class DocumentNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Document${id ? ` ${id}` : ''} not found`);
  }
}

export class DocumentAccessDeniedException extends ForbiddenException {
  constructor() {
    super('You do not have access to this document');
  }
}

export class InvalidDocumentContentException extends BadRequestException {
  constructor(message = 'Invalid document content') {
    super(message);
  }
}

export class InvalidScanException extends BadRequestException {
  constructor(message = 'Invalid scan input') {
    super(message);
  }
}

export class ScanNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Scan${id ? ` ${id}` : ''} not found`);
  }
}

export class OcrFailedException extends BadRequestException {
  constructor(message = 'OCR processing failed') {
    super(message);
  }
}

export class HandwritingRecognitionFailedException extends BadRequestException {
  constructor(message = 'Handwriting recognition failed') {
    super(message);
  }
}

export class BackgroundRemovalFailedException extends BadRequestException {
  constructor(message = 'Background removal failed') {
    super(message);
  }
}

export class PdfGenerationFailedException extends BadRequestException {
  constructor(message = 'PDF generation failed') {
    super(message);
  }
}

export class ExportFailedException extends BadRequestException {
  constructor(message = 'Export failed') {
    super(message);
  }
}

export class VersionNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Version${id ? ` ${id}` : ''} not found`);
  }
}

export class AssetNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Asset${id ? ` ${id}` : ''} not found`);
  }
}

export class CategoryNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(`Category${id ? ` ${id}` : ''} not found`);
  }
}

export class InvalidObjectIdException extends BadRequestException {
  constructor(id?: string) {
    super(`Invalid id${id ? `: ${id}` : ''}`);
  }
}
