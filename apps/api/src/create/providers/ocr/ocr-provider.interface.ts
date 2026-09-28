export interface OcrWord {
  text: string;
  confidence?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OcrLine {
  text: string;
  confidence?: number;
  words?: OcrWord[];
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OcrBlock {
  text: string;
  confidence?: number;
  lines?: OcrLine[];
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  blocks?: OcrBlock[];
}

export interface OcrResult {
  provider: string;
  text: string;
  confidence: number;
  pages: OcrPageResult[];
  blocks: OcrBlock[];
  lines: OcrLine[];
  words: OcrWord[];
}

export interface OcrRunOptions {
  language?: string;
  /** true when this call is for handwriting recognition rather than printed text */
  handwriting?: boolean;
}

/**
 * Provider-agnostic OCR contract. Concrete implementations (local, Google
 * Vision, Azure Computer Vision, ...) plug in behind this interface so the
 * rest of the app never depends on a specific vendor SDK.
 */
export interface OcrProvider {
  readonly name: string;
  recognize(filePath: string, options?: OcrRunOptions): Promise<OcrResult>;
}
