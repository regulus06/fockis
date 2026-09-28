export enum DocumentScanType {
  DOCUMENT = "document",
  PHOTO = "photo",
  PASSPORT = "passport",
  RECEIPT = "receipt",
  HANDWRITING = "handwriting",
  OTHER = "other",
}

export enum DocumentScanStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum DocumentProcessingType {
  ORIGINAL = "original",
  ENHANCED = "enhanced",
  CROPPED = "cropped",
  OCR = "ocr",
  BACKGROUND_REMOVED = "background_removed",
}

export interface OcrResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface DocumentFile {
  originalName: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface DocumentProcessingResult {
  success: boolean;
  type: DocumentProcessingType;
  outputPath?: string;
  text?: string;
  confidence?: number;
  message?: string;
}