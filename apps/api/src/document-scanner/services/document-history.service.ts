import { Injectable } from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  ScannedDocument,
  ScannedDocumentDocument,
} from "../schemas/scanned-document.schema";

@Injectable()
export class DocumentHistoryService {
  constructor(
    @InjectModel(ScannedDocument.name)
    private readonly scannedDocumentModel: Model<ScannedDocumentDocument>,
  ) {}

  async getHistory(
    userId: string,
    page = 1,
    limit = 20,
  ) {
    const safePage = Math.max(
      1,
      Number(page),
    );

    const safeLimit = Math.min(
      100,
      Math.max(1, Number(limit)),
    );

    const skip =
      (safePage - 1) * safeLimit;

    const filter = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    const [documents, total] =
      await Promise.all([
        this.scannedDocumentModel
          .find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(safeLimit)
          .lean(),

        this.scannedDocumentModel.countDocuments(
          filter,
        ),
      ]);

    return {
      documents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(
          total / safeLimit,
        ),
      },
    };
  }
}