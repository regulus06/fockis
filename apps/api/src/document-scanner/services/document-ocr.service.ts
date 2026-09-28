import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { createWorker } from "tesseract.js";

import {
  ScannedDocument,
  ScannedDocumentDocument,
} from "../schemas/scanned-document.schema";

@Injectable()
export class DocumentOcrService {
  constructor(
    @InjectModel(ScannedDocument.name)
    private readonly scannedDocumentModel: Model<ScannedDocumentDocument>,
  ) {}

  async process(
    userId: string,
    documentId: string,
    language = "eng",
  ) {
    const document =
      await this.scannedDocumentModel.findOne({
        _id: documentId,
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      });

    if (!document) {
      throw new NotFoundException(
        "Document not found",
      );
    }

    if (!document.filePath) {
      throw new NotFoundException(
        "Document file not found",
      );
    }

    const worker = await createWorker(language);

    try {
      const result = await worker.recognize(
        document.filePath,
      );

      const text = result.data.text;
      const confidence = result.data.confidence || 0;

      document.ocrText = text;
      document.ocrConfidence = confidence;
      document.ocrLanguage = language;

      await document.save();

      return {
        success: true,
        documentId: document.id,
        text,
        confidence,
        language,
      };
    } finally {
      await worker.terminate();
    }
  }

  async processFile(
    filePath: string,
    language = "eng",
  ) {
    const worker = await createWorker(language);

    try {
      const result = await worker.recognize(
        filePath,
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence || 0,
        language,
      };
    } finally {
      await worker.terminate();
    }
  }
}