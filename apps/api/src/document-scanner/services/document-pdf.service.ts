import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  PDFDocument,
} from "pdf-lib";

import fs from "fs/promises";
import path from "path";

import {
  ScannedDocument,
  ScannedDocumentDocument,
} from "../schemas/scanned-document.schema";

@Injectable()
export class DocumentPdfService {
  constructor(
    @InjectModel(ScannedDocument.name)
    private readonly scannedDocumentModel: Model<ScannedDocumentDocument>,
  ) {}

  async createPdf(
    userId: string,
    documentId: string,
    title?: string,
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

    const sourcePath =
      document.enhancedFilePath ||
      document.croppedFilePath ||
      document.filePath;

    if (!sourcePath) {
      throw new NotFoundException(
        "Source image not found",
      );
    }

    const pdfDoc = await PDFDocument.create();

    const imageBuffer = await fs.readFile(
      sourcePath,
    );

    let image;

    if (
      document.mimeType === "image/png" ||
      sourcePath.toLowerCase().endsWith(".png")
    ) {
      image = await pdfDoc.embedPng(
        imageBuffer,
      );
    } else {
      image = await pdfDoc.embedJpg(
        imageBuffer,
      );
    }

    const dimensions = image.scale(1);

    const page = pdfDoc.addPage([
      dimensions.width,
      dimensions.height,
    ]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height,
    });

    const pdfBytes = await pdfDoc.save();

    const outputPath = path.join(
      path.dirname(sourcePath),
      `${path.basename(
        sourcePath,
        path.extname(sourcePath),
      )}.pdf`,
    );

    await fs.writeFile(
      outputPath,
      pdfBytes,
    );

    document.pdfFilePath = outputPath;

    if (title) {
      document.title = title;
    }

    await document.save();

    return {
      success: true,
      documentId: document.id,
      pdfPath: outputPath,
    };
  }
}