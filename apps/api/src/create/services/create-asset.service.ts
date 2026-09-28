import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Asset,
  AssetDocument,
  AssetType,
} from '../schemas/create-asset.schema';

import { StorageService } from '../utils/storage.service';

import {
  AssetNotFoundException,
  InvalidScanException,
} from '../constants/errors';

import { assertValidObjectId } from '../utils/object-id.util';

import { CreateDocumentService } from './create-document.service';

@Injectable()
export class CreateAssetService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,

    private readonly storage: StorageService,

    private readonly documentService: CreateDocumentService,
  ) {}

  /**
   * Upload an asset and attach it to a document.
   */
  async uploadForDocument(
    documentId: string,
    userId: string,
    file: Express.Multer.File,
    type: AssetType = AssetType.OTHER,
  ) {
    if (!file) {
      throw new InvalidScanException(
        'No file was uploaded',
      );
    }

    assertValidObjectId(documentId);
    assertValidObjectId(userId);

    // Verify that the document belongs to this user.
    await this.documentService.getById(
      documentId,
      userId,
    );

    const saved = await this.storage.save(
      'assets',
      file.buffer,
      file.originalname,
    );

    const asset =
      await this.assetModel.create({
        userId:
          new Types.ObjectId(userId),

        documentId:
          new Types.ObjectId(documentId),

        type,

        url: saved.url,

        filename:
          file.originalname,

        mimeType:
          file.mimetype,

        size:
          file.size,
      });

    return asset;
  }

  /**
   * List all assets belonging to a document.
   */
  async listForDocument(
    documentId: string,
    userId: string,
  ) {
    assertValidObjectId(documentId);
    assertValidObjectId(userId);

    // Verify document ownership.
    await this.documentService.getById(
      documentId,
      userId,
    );

    return this.assetModel
      .find({
        documentId:
          new Types.ObjectId(
            documentId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      })
      .sort({
        createdAt: -1,
      })
      .lean()
      .exec();
  }

  /**
   * Remove an asset from a document.
   */
  async remove(
    documentId: string,
    assetId: string,
    userId: string,
  ) {
    assertValidObjectId(documentId);
    assertValidObjectId(assetId);
    assertValidObjectId(userId);

    // Verify document ownership.
    await this.documentService.getById(
      documentId,
      userId,
    );

    const asset =
      await this.assetModel
        .findOneAndDelete({
          _id:
            new Types.ObjectId(
              assetId,
            ),

          documentId:
            new Types.ObjectId(
              documentId,
            ),

          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .exec();

    if (!asset) {
      throw new AssetNotFoundException(
        assetId,
      );
    }

    return {
      deleted: true,
      id: assetId,
    };
  }

  /**
   * Find an asset belonging to the current user.
   */
  async findByIdForUser(
    assetId: string,
    userId: string,
  ) {
    assertValidObjectId(assetId);
    assertValidObjectId(userId);

    const asset =
      await this.assetModel
        .findOne({
          _id:
            new Types.ObjectId(
              assetId,
            ),

          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .lean()
        .exec();

    if (!asset) {
      throw new AssetNotFoundException(
        assetId,
      );
    }

    return asset;
  }
}