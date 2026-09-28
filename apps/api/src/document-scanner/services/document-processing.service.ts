import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

import {
  ScannedDocument,
  ScannedDocumentDocument,
} from "../schemas/scanned-document.schema";

@Injectable()
export class DocumentProcessingService {
  constructor(
    @InjectModel(ScannedDocument.name)
    private readonly scannedDocumentModel: Model<ScannedDocumentDocument>,
  ) {}

  // ==========================================================================
  // GET DOCUMENT
  // ==========================================================================

  private async getDocument(
    userId: string,
    documentId: string,
  ): Promise<ScannedDocumentDocument> {
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

    return document;
  }

  // ==========================================================================
  // GET VERIFIED FILE PATH
  // ==========================================================================

  /**
   * The schema allows filePath to be optional.
   *
   * At runtime getDocument() guarantees that it exists.
   * This helper converts that runtime guarantee into
   * an explicit TypeScript string.
   */
  private getFilePath(
    document: ScannedDocumentDocument,
  ): string {
    const filePath = document.filePath;

    if (!filePath) {
      throw new NotFoundException(
        "Document file not found",
      );
    }

    return filePath;
  }

  // ==========================================================================
  // ENHANCE DOCUMENT
  // ==========================================================================

  async enhance(
    userId: string,
    documentId: string,
    options: {
      grayscale?: boolean;
      sharpen?: boolean;
      contrast?: number;
      brightness?: number;
    },
  ) {
    const document =
      await this.getDocument(
        userId,
        documentId,
      );

    const filePath =
      this.getFilePath(document);

    const extension =
      path.extname(filePath) || ".jpg";

    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(
        filePath,
        extension,
      )}-enhanced${extension}`,
    );

    let image = sharp(filePath);

    // ------------------------------------------------------------------------
    // GRAYSCALE
    // ------------------------------------------------------------------------

    if (options.grayscale) {
      image = image.grayscale();
    }

    // ------------------------------------------------------------------------
    // SHARPEN
    // ------------------------------------------------------------------------

    if (options.sharpen) {
      image = image.sharpen();
    }

    // ------------------------------------------------------------------------
    // CONTRAST
    // ------------------------------------------------------------------------

    if (
      options.contrast !== undefined
    ) {
      image = image.modulate({
        brightness: options.contrast,
      });
    }

    // ------------------------------------------------------------------------
    // BRIGHTNESS
    // ------------------------------------------------------------------------

    if (
      options.brightness !== undefined
    ) {
      image = image.modulate({
        brightness: options.brightness,
      });
    }

    await image
      .jpeg({
        quality: 92,
      })
      .toFile(outputPath);

    document.enhancedFilePath =
      outputPath;

    await document.save();

    return {
      success: true,
      documentId: document.id,
      outputPath,
    };
  }

  // ==========================================================================
  // CROP DOCUMENT
  // ==========================================================================

  async crop(
    userId: string,
    documentId: string,
    left: number,
    top: number,
    width: number,
    height: number,
  ) {
    const document =
      await this.getDocument(
        userId,
        documentId,
      );

    const filePath =
      this.getFilePath(document);

    const extension =
      path.extname(filePath) || ".jpg";

    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(
        filePath,
        extension,
      )}-cropped${extension}`,
    );

    await sharp(filePath)
      .extract({
        left,
        top,
        width,
        height,
      })
      .jpeg({
        quality: 92,
      })
      .toFile(outputPath);

    document.croppedFilePath =
      outputPath;

    await document.save();

    return {
      success: true,
      documentId: document.id,
      outputPath,
    };
  }

  // ==========================================================================
  // REMOVE BACKGROUND
  // ==========================================================================

  async removeBackground(
    userId: string,
    documentId: string,
  ) {
    const document =
      await this.getDocument(
        userId,
        documentId,
      );

    const filePath =
      this.getFilePath(document);

    const extension =
      path.extname(filePath) || ".jpg";

    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(
        filePath,
        extension,
      )}-transparent.png`,
    );

    /*
     * Current implementation converts
     * the image into an alpha-enabled PNG.
     *
     * A real AI background-removal engine
     * can be connected later.
     */

    await sharp(filePath)
      .ensureAlpha()
      .png()
      .toFile(outputPath);

    document.backgroundRemovedFilePath =
      outputPath;

    await document.save();

    return {
      success: true,
      documentId: document.id,
      outputPath,
      message:
        "Background processing completed",
    };
  }

  // ==========================================================================
  // ENSURE DIRECTORY
  // ==========================================================================

  async ensureDirectory(
    directory: string,
  ): Promise<void> {
    await fs.mkdir(directory, {
      recursive: true,
    });
  }
}