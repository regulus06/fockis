import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Scan,
  ScanDocument,
  ScanStatus,
  ScanType,
} from '../schemas/create-scan.schema';

import {
  DocumentSource,
} from '../schemas/create-document.schema';

import { StorageService } from '../utils/storage.service';

import {
  InvalidScanException,
  ScanNotFoundException,
} from '../constants/errors';

import { assertValidObjectId } from '../utils/object-id.util';

import { CreateDocumentService } from './create-document.service';

import {
  CreateToolType,
  ElementType,
} from '../interfaces/editor.interfaces';

@Injectable()
export class CreateScannerService {
  constructor(
    @InjectModel(Scan.name)
    private readonly scanModel: Model<ScanDocument>,

    private readonly storage: StorageService,

    private readonly documentService: CreateDocumentService,
  ) {}

  async createScan(
    userId: string,
    file: Express.Multer.File,
    type: ScanType = ScanType.DOCUMENT,
  ) {
    if (!file) {
      throw new InvalidScanException(
        'No file was uploaded',
      );
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new InvalidScanException(
        'Invalid user ID',
      );
    }

    const saved = await this.storage.save(
      'scans',
      file.buffer,
      file.originalname,
    );

    const scan = await this.scanModel.create({
      userId: new Types.ObjectId(userId),
      originalFile: saved.path,
      type,
      status: ScanStatus.UPLOADED,
      pageCount: 1,
    });

    return {
      ...scan.toObject(),
      url: saved.url,
    };
  }

  async getById(
    scanId: string,
    userId: string,
  ) {
    assertValidObjectId(scanId);

    if (!Types.ObjectId.isValid(userId)) {
      throw new InvalidScanException(
        'Invalid user ID',
      );
    }

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

  async listForUser(
    userId: string,
    limit = 20,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new InvalidScanException(
        'Invalid user ID',
      );
    }

    return this.scanModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async createDocumentFromScan(
    scanId: string,
    userId: string,
    opts: {
      title?: string;
      type?: CreateToolType;
    } = {},
  ) {
    assertValidObjectId(scanId);

    if (!Types.ObjectId.isValid(userId)) {
      throw new InvalidScanException(
        'Invalid user ID',
      );
    }

    const scan = await this.scanModel.findOne({
      _id: scanId,
      userId: new Types.ObjectId(userId),
    });

    if (!scan) {
      throw new ScanNotFoundException(scanId);
    }

    const hasExtractedText =
      !!scan.extractedText?.trim();

    const document =
      await this.documentService.createFromSource(
        userId,
        {
          title:
            opts.title ||
            `Scanned document — ${new Date(
              scan.createdAt,
            ).toLocaleDateString()}`,

          type:
            opts.type ||
            CreateToolType.OTHER,

          source:
            scan.ocrStatus === 'COMPLETED'
              ? DocumentSource.OCR
              : DocumentSource.SCAN,

          content: {
            fields: {
              extractedText:
                scan.extractedText || '',
            },

            elements: hasExtractedText
              ? [
                  {
                    id: 'extracted-text',

                    /*
                     * IMPORTANT:
                     * Use the ElementType enum instead
                     * of the string "text".
                     */
                    type: ElementType.TEXT,

                    fieldKey:
                      'extractedText',

                    content:
                      scan.extractedText,

                    position: {
                      x: 0,
                      y: 0,
                      width: 800,
                      height: 1000,
                    },

                    style: {
                      fontFamily: 'Inter',
                      fontSize: 14,
                    },
                  },
                ]
              : [],
          },

          scanId:
            scan._id.toString(),
        },
      );

    scan.documentId =
      document._id;

    await scan.save();

    return document;
  }

  async extract(
    scanId: string,
    userId: string,
  ) {
    const scan =
      await this.getById(
        scanId,
        userId,
      );

    return {
      scanId: scan._id,

      text:
        scan.extractedText || '',

      ocrResult:
        scan.ocrResult || null,

      ocrStatus:
        scan.ocrStatus,
    };
  }
}