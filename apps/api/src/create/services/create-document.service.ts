import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  CreateDocument,
  CreateDocumentDocument,
  DocumentSource,
  DocumentStatus,
} from '../schemas/create-document.schema';

import {
  CreateToolType,
  DocumentContent,
} from '../interfaces/editor.interfaces';

/* ============================================================================
   TYPES
============================================================================ */

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: CreateToolType;
  status?: DocumentStatus;
  favorite?: boolean;
}

export interface CreateDocumentFromSourceInput {
  title: string;
  type: CreateToolType;
  source: DocumentSource;
  content?: DocumentContent;
  templateId?: string;
  scanId?: string;
}

@Injectable()
export class CreateDocumentService {
  constructor(
    @InjectModel(CreateDocument.name)
    private readonly documentModel: Model<CreateDocumentDocument>,
  ) {}

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private objectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new NotFoundException('Document not found');
    }

    return new Types.ObjectId(value);
  }

  private normalizeContent(
    content?: Partial<DocumentContent>,
  ): DocumentContent {
    return {
      fields: content?.fields || {},
      elements: Array.isArray(content?.elements)
        ? content.elements
        : [],
    };
  }

  /**
   * Return a document in a frontend-friendly shape.
   *
   * Mongoose normally provides `_id`, but the frontend may use either
   * `_id` or `id`. Providing both avoids navigation failures caused by
   * inconsistent response shapes.
   */
  private serializeDocument(document: any) {
    if (!document) {
      return document;
    }

    const plain =
      typeof document.toObject === 'function'
        ? document.toObject()
        : { ...document };

    const id =
      plain.id ||
      plain._id?.toString?.() ||
      String(plain._id);

    return {
      ...plain,
      id,
      _id: plain._id?.toString?.() || id,
    };
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    userId: string,
    data: {
      title: string;
      templateId?: string;
      type?: CreateToolType;
      content?: DocumentContent;
    },
  ) {
    const document =
      await this.documentModel.create({
        userId: new Types.ObjectId(userId),

        title:
          data.title?.trim() ||
          'Untitled Document',

        templateId:
          data.templateId &&
          Types.ObjectId.isValid(
            data.templateId,
          )
            ? new Types.ObjectId(
                data.templateId,
              )
            : undefined,

        type:
          data.type ||
          CreateToolType.OTHER,

        source:
          DocumentSource.SCRATCH,

        status:
          DocumentStatus.DRAFT,

        content:
          this.normalizeContent(
            data.content,
          ),
      });

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     CREATE FROM SOURCE
  ========================================================================== */

  async createFromSource(
    userId: string,
    input: CreateDocumentFromSourceInput,
  ) {
    const document =
      await this.documentModel.create({
        userId:
          new Types.ObjectId(userId),

        title:
          input.title?.trim() ||
          'Untitled Document',

        templateId:
          input.templateId &&
          Types.ObjectId.isValid(
            input.templateId,
          )
            ? new Types.ObjectId(
                input.templateId,
              )
            : undefined,

        type: input.type,

        source: input.source,

        status:
          DocumentStatus.DRAFT,

        scanId:
          input.scanId &&
          Types.ObjectId.isValid(
            input.scanId,
          )
            ? new Types.ObjectId(
                input.scanId,
              )
            : undefined,

        content:
          this.normalizeContent(
            input.content,
          ),
      });

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     FIND ONE
  ========================================================================== */

  async findById(
    documentId: string,
    userId: string,
    _includeContent = true,
  ) {
    const documentObjectId =
      this.objectId(documentId);

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const document =
      await this.documentModel
        .findOne({
          _id: documentObjectId,
          userId:
            new Types.ObjectId(userId),
        })
        .exec();

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     BACKWARD COMPATIBILITY
  ========================================================================== */

  async getById(
    documentId: string,
    userId: string,
  ) {
    return this.findById(
      documentId,
      userId,
    );
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async list(
    userId: string,
    query: DocumentListQuery = {},
  ) {
    if (
      !Types.ObjectId.isValid(userId)
    ) {
      return {
        documents: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      };
    }

    const page = Math.max(
      Number(query.page) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(query.limit) || 20,
        1,
      ),
      100,
    );

    const filter: Record<string, any> = {
      userId:
        new Types.ObjectId(userId),
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (
      typeof query.favorite ===
      'boolean'
    ) {
      filter.favorite =
        query.favorite;
    }

    if (query.search?.trim()) {
      filter.title = {
        $regex:
          query.search.trim(),
        $options: 'i',
      };
    }

    const skip =
      (page - 1) * limit;

    const [
      documents,
      total,
    ] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.documentModel
        .countDocuments(filter),
    ]);

    return {
      documents:
        documents.map((document) =>
          this.serializeDocument(
            document,
          ),
        ),

      total,
      page,
      limit,

      pages: Math.ceil(
        total / limit,
      ),
    };
  }

  /* ==========================================================================
     RECENT
  ========================================================================== */

  async findRecent(
    userId: string,
    limit = 10,
  ) {
    if (
      !Types.ObjectId.isValid(userId)
    ) {
      return [];
    }

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 10,
        1,
      ),
      50,
    );

    const documents =
      await this.documentModel
        .find({
          userId:
            new Types.ObjectId(userId),
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .limit(safeLimit)
        .lean()
        .exec();

    return documents.map(
      (document) =>
        this.serializeDocument(
          document,
        ),
    );
  }

  /* ==========================================================================
     SEARCH
  ========================================================================== */

  async search(
    userId: string,
    searchText: string,
    query: DocumentListQuery = {},
  ) {
    const search =
      searchText?.trim();

    if (!search) {
      return this.list(
        userId,
        query,
      );
    }

    return this.list(
      userId,
      {
        ...query,
        search,
      },
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    documentId: string,
    userId: string,
    data: Record<string, unknown>,
  ) {
    const documentObjectId =
      this.objectId(documentId);

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const updateData: Record<
      string,
      any
    > = {
      ...data,
    };

    if (updateData.content) {
      const content =
        updateData.content as Partial<DocumentContent>;

      updateData.content =
        this.normalizeContent(
          content,
        );
    }

    const document =
      await this.documentModel
        .findOneAndUpdate(
          {
            _id: documentObjectId,
            userId:
              new Types.ObjectId(userId),
          },
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     AUTOSAVE
  ========================================================================== */

  async autosave(
    documentId: string,
    userId: string,
    data: {
      title?: string;
      content?: DocumentContent;
    },
  ) {
    const updateData: Record<
      string,
      any
    > = {};

    if (
      typeof data.title ===
      'string'
    ) {
      updateData.title =
        data.title;
    }

    if (data.content) {
      updateData.content =
        this.normalizeContent(
          data.content,
        );
    }

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return this.findById(
        documentId,
        userId,
      );
    }

    return this.update(
      documentId,
      userId,
      updateData,
    );
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  async remove(
    documentId: string,
    userId: string,
  ) {
    const documentObjectId =
      this.objectId(documentId);

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const document =
      await this.documentModel
        .findOneAndDelete({
          _id: documentObjectId,
          userId:
            new Types.ObjectId(userId),
        })
        .exec();

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return {
      success: true,
      id: documentId,
    };
  }

  /* ==========================================================================
     DUPLICATE
  ========================================================================== */

  async duplicate(
    documentId: string,
    userId: string,
    title?: string,
  ) {
    const original =
      await this.findById(
        documentId,
        userId,
      );

    const duplicateData: Record<
      string,
      any
    > = {
      userId:
        new Types.ObjectId(userId),

      title:
        title?.trim() ||
        `${original.title} Copy`,

      type: original.type,

      source: original.source,

      status:
        DocumentStatus.DRAFT,

      favorite: false,

      content:
        this.normalizeContent(
          original.content,
        ),

      templateId:
        original.templateId,

      scanId:
        original.scanId,
    };

    const duplicate =
      await this.documentModel.create(
        duplicateData,
      );

    return this.serializeDocument(
      duplicate,
    );
  }

  /* ==========================================================================
     ARCHIVE
  ========================================================================== */

  async archive(
    documentId: string,
    userId: string,
  ) {
    return this.setStatus(
      documentId,
      userId,
      DocumentStatus.COMPLETED,
    );
  }

  /* ==========================================================================
     RESTORE
  ========================================================================== */

  async restore(
    documentId: string,
    userId: string,
  ) {
    return this.setStatus(
      documentId,
      userId,
      DocumentStatus.DRAFT,
    );
  }

  /* ==========================================================================
     STATUS
  ========================================================================== */

  private async setStatus(
    documentId: string,
    userId: string,
    status: DocumentStatus,
  ) {
    const documentObjectId =
      this.objectId(documentId);

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const document =
      await this.documentModel
        .findOneAndUpdate(
          {
            _id: documentObjectId,
            userId:
              new Types.ObjectId(userId),
          },
          {
            $set: {
              status,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     FAVORITE
  ========================================================================== */

  async setFavorite(
    documentId: string,
    userId: string,
    favorite: boolean,
  ) {
    const documentObjectId =
      this.objectId(documentId);

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const document =
      await this.documentModel
        .findOneAndUpdate(
          {
            _id: documentObjectId,
            userId:
              new Types.ObjectId(userId),
          },
          {
            $set: {
              favorite,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return this.serializeDocument(
      document,
    );
  }

  /* ==========================================================================
     APPLY TEMPLATE
  ========================================================================== */

  async applyTemplate(
    documentId: string,
    userId: string,
    templateId: string,
    fieldMapping?: Record<
      string,
      any
    >,
  ) {
    const document =
      await this.findById(
        documentId,
        userId,
      );

    const updateData: Record<
      string,
      any
    > = {};

    if (
      Types.ObjectId.isValid(
        templateId,
      )
    ) {
      updateData.templateId =
        new Types.ObjectId(
          templateId,
        );
    }

    if (fieldMapping) {
      updateData.content = {
        fields: {
          ...(document.content
            ?.fields || {}),
          ...fieldMapping,
        },

        elements:
          document.content
            ?.elements || [],
      };
    }

    return this.update(
      documentId,
      userId,
      updateData,
    );
  }
}