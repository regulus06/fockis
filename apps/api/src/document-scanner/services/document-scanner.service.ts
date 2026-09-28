import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  ScannedDocument,
  ScannedDocumentDocument,
} from "../schemas/scanned-document.schema";

import { ScanDocumentDto } from "../dto/scan-document.dto";

import {
  DocumentScanStatus,
  DocumentScanType,
} from "../types/document-scanner.types";

@Injectable()
export class DocumentScannerService {
  constructor(
    @InjectModel(ScannedDocument.name)
    private readonly scannedDocumentModel: Model<ScannedDocumentDocument>,
  ) {}

  async create(
    userId: string,
    file: Express.Multer.File,
    dto: ScanDocumentDto,
  ) {
    const document = await this.scannedDocumentModel.create({
      userId: new Types.ObjectId(userId),
      title:
        dto.title ||
        file.originalname.replace(/\.[^/.]+$/, ""),
      type: dto.type || DocumentScanType.DOCUMENT,
      status: DocumentScanStatus.COMPLETED,
      originalName: file.originalname,
      filename: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return document;
  }

  async findById(
    userId: string,
    documentId: string,
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

    return document;
  }

  async update(
    userId: string,
    documentId: string,
    data: {
      title?: string;
      tags?: string[];
    },
  ) {
    const document =
      await this.scannedDocumentModel.findOneAndUpdate(
        {
          _id: documentId,
          userId: new Types.ObjectId(userId),
          isDeleted: false,
        },
        {
          $set: data,
        },
        {
          new: true,
        },
      );

    if (!document) {
      throw new NotFoundException(
        "Document not found",
      );
    }

    return document;
  }

  async delete(
    userId: string,
    documentId: string,
  ) {
    const document =
      await this.scannedDocumentModel.findOneAndUpdate(
        {
          _id: documentId,
          userId: new Types.ObjectId(userId),
          isDeleted: false,
        },
        {
          $set: {
            isDeleted: true,
          },
        },
        {
          new: true,
        },
      );

    if (!document) {
      throw new NotFoundException(
        "Document not found",
      );
    }

    return {
      success: true,
      message: "Document deleted",
    };
  }
}