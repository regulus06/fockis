import {
  DocumentScanStatus,
  DocumentScanType,
  OcrResult,
} from "../types/document-scanner.types";

export interface CreateScannedDocumentData {
  userId: string;
  title?: string;
  type?: DocumentScanType;
  originalName: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

export interface UpdateScannedDocumentData {
  title?: string;
  status?: DocumentScanStatus;
  ocrText?: string;
  ocrConfidence?: number;
}

export interface ScannerOcrResponse {
  success: boolean;
  documentId?: string;
  result?: OcrResult;
  message?: string;
}

export interface ScannerProcessingResponse {
  success: boolean;
  documentId?: string;
  outputPath?: string;
  message?: string;
}