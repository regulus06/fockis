import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Scan,
  ScanDocument,
  OcrStatus,
  ScanStatus,
} from '../schemas/create-scan.schema';

import type { OcrProvider } from '../providers/ocr/ocr-provider.interface';

import {
  HANDWRITING_PROVIDER,
  OCR_PROVIDER,
} from '../providers/ocr/ocr-provider.token';

import {
  OcrFailedException,
  ScanNotFoundException,
} from '../constants/errors';

import { assertValidObjectId } from '../utils/object-id.util';

@Injectable()
export class CreateOcrService {
  constructor(
    @InjectModel(Scan.name)
    private readonly scanModel: Model<ScanDocument>,

    @Inject(OCR_PROVIDER)
    private readonly ocrProvider: OcrProvider,

    @Inject(HANDWRITING_PROVIDER)
    private readonly handwritingProvider: OcrProvider,
  ) {}

  // ---------------------------------------------------------------------------
  // OCR
  // ---------------------------------------------------------------------------

  async runOcr(
    scanId: string,
    userId: string,
    language?: string,
  ) {
    assertValidObjectId(scanId);

    const scan = await this.scanModel.findOne({
      _id: scanId,
      userId: new Types.ObjectId(userId),
    });

    if (!scan) {
      throw new ScanNotFoundException(scanId);
    }

    scan.ocrStatus = OcrStatus.PENDING;
    scan.status = ScanStatus.PROCESSING;

    await scan.save();

    try {
      const filePath =
        scan.processedFile || scan.originalFile;

      const result =
        await this.ocrProvider.recognize(
          filePath,
          {
            language,
          },
        );

      scan.extractedText = result.text;

      scan.ocrResult = {
        confidence: result.confidence,
        pages: result.pages,
        blocks: result.blocks,
        lines: result.lines,
        words: result.words,
        provider: result.provider,
      };

      scan.ocrStatus = OcrStatus.COMPLETED;
      scan.status = ScanStatus.COMPLETED;

      await scan.save();

      return scan;
    } catch (err: any) {
      scan.ocrStatus = OcrStatus.FAILED;
      scan.status = ScanStatus.FAILED;
      scan.failureReason = err?.message || 'OCR processing failed';

      await scan.save();

      if (err instanceof OcrFailedException) {
        throw err;
      }

      throw new OcrFailedException(
        err?.message || 'OCR processing failed',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // HANDWRITING OCR
  // ---------------------------------------------------------------------------

  async runHandwriting(
    scanId: string,
    userId: string,
    language?: string,
  ) {
    assertValidObjectId(scanId);

    const scan = await this.scanModel.findOne({
      _id: scanId,
      userId: new Types.ObjectId(userId),
    });

    if (!scan) {
      throw new ScanNotFoundException(scanId);
    }

    scan.ocrStatus = OcrStatus.PENDING;
    scan.status = ScanStatus.PROCESSING;

    await scan.save();

    try {
      const filePath =
        scan.processedFile || scan.originalFile;

      const result =
        await this.handwritingProvider.recognize(
          filePath,
          {
            language,
            handwriting: true,
          },
        );

      scan.extractedText = result.text;

      scan.ocrResult = {
        confidence: result.confidence,
        pages: result.pages,
        blocks: result.blocks,
        lines: result.lines,
        words: result.words,
        provider: `${result.provider}-handwriting`,
      };

      scan.ocrStatus = OcrStatus.COMPLETED;
      scan.status = ScanStatus.COMPLETED;

      await scan.save();

      return scan;
    } catch (err: any) {
      scan.ocrStatus = OcrStatus.FAILED;
      scan.status = ScanStatus.FAILED;
      scan.failureReason =
        err?.message || 'Handwriting recognition failed';

      await scan.save();

      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // GET SCAN
  // ---------------------------------------------------------------------------

  async getById(
    scanId: string,
    userId: string,
  ) {
    assertValidObjectId(scanId);

    const scan = await this.scanModel
      .findOne({
        _id: scanId,
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!scan) {
      throw new ScanNotFoundException(scanId);
    }

    return scan;
  }
}