import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DocumentVersion,
  DocumentVersionDocument,
} from '../schemas/create-document-version.schema';
import {
  CreateDocument,
  CreateDocumentDocument,
} from '../schemas/create-document.schema';
import { DocumentContent } from '../interfaces/editor.interfaces';
import { DocumentNotFoundException, VersionNotFoundException } from '../constants/errors';
import { assertValidObjectId } from '../utils/object-id.util';

@Injectable()
export class CreateVersionService {
  constructor(
    @InjectModel(DocumentVersion.name)
    private readonly versionModel: Model<DocumentVersionDocument>,
    @InjectModel(CreateDocument.name)
    private readonly documentModel: Model<CreateDocumentDocument>,
  ) {}

  /** Creates a new version snapshot and bumps document.currentVersion. Never overwrites history. */
  async snapshot(
    document: CreateDocumentDocument,
    content: DocumentContent,
    opts: { isAutosave?: boolean; note?: string } = {},
  ): Promise<DocumentVersionDocument> {
    const nextVersion = document.currentVersion + 1;

    const version = await this.versionModel.create({
      documentId: document._id,
      userId: document.userId,
      version: nextVersion,
      content,
      title: document.title,
      isAutosave: !!opts.isAutosave,
      note: opts.note,
    });

    document.currentVersion = nextVersion;
    return version;
  }

  async listForDocument(documentId: string, userId: string) {
    assertValidObjectId(documentId);
    await this.assertDocumentOwnership(documentId, userId);
    return this.versionModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .sort({ version: -1 })
      .lean();
  }

  async getVersion(documentId: string, versionId: string, userId: string) {
    assertValidObjectId(documentId);
    assertValidObjectId(versionId);
    await this.assertDocumentOwnership(documentId, userId);

    const version = await this.versionModel.findOne({
      _id: versionId,
      documentId: new Types.ObjectId(documentId),
    }).lean();
    if (!version) throw new VersionNotFoundException(versionId);
    return version;
  }

  /**
   * Restores a historical version by creating a NEW current version with
   * that snapshot's content — the original historical entries are never
   * deleted or mutated.
   */
  async restoreVersion(documentId: string, versionId: string, userId: string) {
    assertValidObjectId(documentId);
    assertValidObjectId(versionId);
    const document = await this.assertDocumentOwnership(documentId, userId);

    const target = await this.versionModel.findOne({
      _id: versionId,
      documentId: new Types.ObjectId(documentId),
    });
    if (!target) throw new VersionNotFoundException(versionId);

    document.content = target.content;
    const newVersion = await this.snapshot(document, target.content, {
      note: `Restored from version ${target.version}`,
    });
    await document.save();

    return { document, version: newVersion };
  }

  private async assertDocumentOwnership(documentId: string, userId: string) {
    const document = await this.documentModel.findOne({ _id: documentId, userId: new Types.ObjectId(userId) });
    if (!document) throw new VersionNotFoundException();
    return document;
  }
}
