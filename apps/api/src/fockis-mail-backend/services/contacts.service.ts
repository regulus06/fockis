import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Contact,
  ContactDocument,
} from '../schemas/contact.schema';

import {
  CreateContactDto,
  UpdateContactDto,
} from '../dto/fockis-mail.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name)
    private readonly model: Model<ContactDocument>,
  ) {}

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private normalizeStatus(
    value?: string,
  ): any {
    if (!value) {
      return undefined;
    }

    const normalized = String(value)
      .trim()
      .toLowerCase();

    const enumValues = Object.values(
      require('../enums/fockis-mail.enums').ContactStatus,
    ) as string[];

    const found = enumValues.find(
      (item) =>
        String(item).toLowerCase() === normalized,
    );

    if (!found) {
      throw new BadRequestException(
        `Invalid contact status: ${value}`,
      );
    }

    return found;
  }

  private statusToFrontend(
    value: unknown,
  ): string {
    return String(value ?? '')
      .toLowerCase();
  }

  private serialize(contact: any) {
    const createdAt =
      contact.createdAt ??
      contact._id?.getTimestamp?.() ??
      new Date();

    const lastActivityAt =
      contact.lastEngagedAt ??
      contact.updatedAt ??
      createdAt;

    const activity = Array.isArray(contact.activity)
      ? contact.activity
          .map((item: any) => ({
            id:
              item.id ??
              String(item._id ?? ''),
            kind:
              item.kind ?? 'activity',
            label:
              item.label ?? 'Contact activity',
            at: new Date(
              item.at ??
                lastActivityAt,
            ).toISOString(),
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.at).getTime() -
              new Date(a.at).getTime(),
          )
      : [];

    const purchases = Array.isArray(contact.purchases)
      ? contact.purchases
          .map((item: any) => ({
            id:
              item.id ??
              String(item._id ?? ''),
            product:
              item.product ?? 'Purchase',
            at: new Date(
              item.at ??
                createdAt,
            ).toISOString(),
            amount:
              Number(item.amount ?? 0),
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.at).getTime() -
              new Date(a.at).getTime(),
          )
      : [];

    return {
      id: String(contact._id),

      businessId: String(
        contact.workspaceId,
      ),

      firstName:
        contact.firstName ?? '',

      lastName:
        contact.lastName ?? '',

      email:
        contact.email ?? '',

      phone:
        contact.phone ?? '',

      location:
        contact.location ?? '',

      status:
        this.statusToFrontend(
          contact.status,
        ),

      tagIds:
        Array.isArray(contact.tags)
          ? contact.tags.map(String)
          : [],

      source:
        contact.customFields?.source ??
        'manual',

      audienceIds:
        Array.isArray(contact.audienceIds)
          ? contact.audienceIds.map(String)
          : [],

      joinedAt:
        new Date(createdAt).toISOString(),

      lastActivityAt:
        new Date(
          lastActivityAt,
        ).toISOString(),

      revenue:
        Number(contact.revenue ?? 0),

      orderCount:
        Number(contact.orderCount ?? 0),

      vip:
        Boolean(contact.vip),

      customFields:
        contact.customFields ?? {},

      activity,

      purchases,
    };
  }

  private buildFilter(
    ownerId: Types.ObjectId,
    workspaceId: string,
    options?: {
      q?: string;
      status?: string;
      audienceId?: string;
      tagId?: string;
    },
  ) {
    const filter: Record<string, any> = {
      ownerId,
      workspaceId,
    };

    const q = options?.q?.trim();

    if (q) {
      const safe = q.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const regex = new RegExp(
        safe,
        'i',
      );

      filter.$or = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
        { location: regex },
      ];
    }

    if (
      options?.status &&
      options.status !== 'all'
    ) {
      filter.status =
        this.normalizeStatus(
          options.status,
        );
    }

    if (
      options?.audienceId &&
      options.audienceId !== 'all'
    ) {
      filter.audienceIds =
        options.audienceId;
    }

    if (options?.tagId) {
      filter.tags =
        options.tagId;
    }

    return filter;
  }

  // ===========================================================================
  // List
  // ===========================================================================

  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
    options?: {
      q?: string;
      status?: string;
      audienceId?: string;
      tagId?: string;
    },
  ) {
    const filter = this.buildFilter(
      ownerId,
      workspaceId,
      options,
    );

    const contacts =
      await this.model
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    return contacts.map(
      (contact) =>
        this.serialize(contact),
    );
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  async get(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    const contact =
      await this.model
        .findOne({
          _id: id,
          ownerId,
          workspaceId,
        })
        .lean();

    if (!contact) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    return this.serialize(contact);
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  async create(
    dto: CreateContactDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    try {
      const data: any = {
        ...dto,
        ownerId,
        workspaceId,
      };

      data.email =
        String(data.email ?? '')
          .trim()
          .toLowerCase();

      if (!data.email) {
        throw new BadRequestException(
          'Email is required.',
        );
      }

      if (data.status) {
        data.status =
          this.normalizeStatus(
            data.status,
          );
      }

      if (
        Array.isArray(data.tagIds)
      ) {
        data.tags =
          data.tagIds.map(String);
      }

      delete data.tagIds;

      if (
        Array.isArray(data.tags)
      ) {
        data.tags =
          data.tags.map(String);
      }

      if (
        data.audienceId
      ) {
        data.audienceIds = [
          String(data.audienceId),
        ];
      }

      delete data.audienceId;

      if (
        Array.isArray(data.audienceIds)
      ) {
        data.audienceIds =
          data.audienceIds.map(String);
      }

      if (!data.customFields) {
        data.customFields = {};
      }

      if (!Array.isArray(data.activity)) {
        data.activity = [];
      }

      if (!Array.isArray(data.purchases)) {
        data.purchases = [];
      }

      if (data.lastEngagedAt) {
        data.lastEngagedAt =
          new Date(data.lastEngagedAt);
      }

      const created =
        await this.model.create(
          data,
        );

      return this.serialize(
        created.toObject(),
      );
    } catch (error: any) {
      if (
        error?.code === 11000
      ) {
        throw new ConflictException(
          'A contact with this email already exists in this workspace.',
        );
      }

      throw error;
    }
  }

  // ===========================================================================
  // Update
  // ===========================================================================

  async update(
    id: string,
    dto: UpdateContactDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    const contact =
      await this.model.findOne({
        _id: id,
        ownerId,
        workspaceId,
      });

    if (!contact) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    const data: any = {
      ...dto,
    };

    if (data.email !== undefined) {
      data.email =
        String(data.email)
          .trim()
          .toLowerCase();
    }

    if (data.status !== undefined) {
      data.status =
        this.normalizeStatus(
          data.status,
        );
    }

    /**
     * Frontend calls these `tagIds`.
     * Schema stores them as `tags`.
     */
    if (
      Array.isArray(data.tagIds)
    ) {
      data.tags =
        data.tagIds.map(String);

      delete data.tagIds;
    }

    /**
     * Continue supporting direct backend `tags`.
     */
    if (
      Array.isArray(data.tags)
    ) {
      data.tags =
        data.tags.map(String);
    }

    /**
     * Single audience ID.
     */
    if (
      data.audienceId
    ) {
      data.audienceIds = [
        String(data.audienceId),
      ];

      delete data.audienceId;
    }

    /**
     * Multiple audience IDs.
     */
    if (
      Array.isArray(
        data.audienceIds,
      )
    ) {
      data.audienceIds =
        data.audienceIds.map(
          String,
        );
    }

    /**
     * Custom fields are merged rather than
     * accidentally deleting existing fields.
     */
    if (
      data.customFields !== undefined
    ) {
      if (
        typeof data.customFields !==
        'object'
      ) {
        throw new BadRequestException(
          'customFields must be an object.',
        );
      }

      data.customFields = {
        ...(contact.customFields ?? {}),
        ...data.customFields,
      };
    }

    /**
     * Adding source through the profile/custom
     * field mechanism remains compatible with
     * the existing serializer.
     */
    if (
      data.source !== undefined
    ) {
      data.customFields = {
        ...(data.customFields ??
          contact.customFields ??
          {}),
        source: data.source,
      };

      delete data.source;
    }

    /**
     * Every profile update counts as activity.
     */
    data.lastEngagedAt =
      new Date();

    Object.assign(
      contact,
      data,
    );

    const saved =
      await contact.save();

    return this.serialize(
      saved.toObject(),
    );
  }

  // ===========================================================================
  // Delete
  // ===========================================================================

  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    const deleted =
      await this.model.findOneAndDelete({
        _id: id,
        ownerId,
        workspaceId,
      });

    if (!deleted) {
      throw new NotFoundException(
        'Contact not found',
      );
    }

    return {
      success: true,
      id,
    };
  }

  // ===========================================================================
  // Stats
  // ===========================================================================

  async stats(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const base = {
      ownerId,
      workspaceId,
    };

    const monthStart =
      new Date();

    monthStart.setDate(1);
    monthStart.setHours(
      0,
      0,
      0,
      0,
    );

    const [
      total,
      subscribed,
      unsubscribed,
      cleaned,
      pending,
      vip,
      newThisMonth,
    ] = await Promise.all([
      this.model.countDocuments(
        base,
      ),

      this.model.countDocuments({
        ...base,
        status:
          this.normalizeStatus(
            'subscribed',
          ),
      }),

      this.model.countDocuments({
        ...base,
        status:
          this.normalizeStatus(
            'unsubscribed',
          ),
      }),

      this.model.countDocuments({
        ...base,
        status:
          this.normalizeStatus(
            'cleaned',
          ),
      }),

      this.model.countDocuments({
        ...base,
        status:
          this.normalizeStatus(
            'pending',
          ),
      }),

      this.model.countDocuments({
        ...base,
        vip: true,
      }),

      this.model.countDocuments({
        ...base,
        createdAt: {
          $gte: monthStart,
        },
      }),
    ]);

    return {
      total,
      subscribed,
      unsubscribed,
      cleaned,
      pending,
      vip,
      newThisMonth,
    };
  }

  // ===========================================================================
  // Bulk actions
  // ===========================================================================

  async bulk(
    ids: string[],
    action: {
      kind?: 'status' | 'tag' | 'untag' | 'delete';
      status?: string;
      tagId?: string;
    },
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (
      !Array.isArray(ids) ||
      ids.length === 0
    ) {
      throw new BadRequestException(
        'At least one contact ID is required.',
      );
    }

    const validIds =
      ids.filter((id) =>
        Types.ObjectId.isValid(id),
      );

    if (
      validIds.length !== ids.length
    ) {
      throw new BadRequestException(
        'One or more contact IDs are invalid.',
      );
    }

    const filter = {
      _id: {
        $in: validIds,
      },
      ownerId,
      workspaceId,
    };

    switch (action?.kind) {
      case 'status': {
        const status =
          this.normalizeStatus(
            action.status,
          );

        if (!status) {
          throw new BadRequestException(
            'status is required.',
          );
        }

        const result =
          await this.model.updateMany(
            filter,
            {
              $set: {
                status,
                lastEngagedAt:
                  new Date(),
              },
            },
          );

        return {
          success: true,
          modified:
            result.modifiedCount,
        };
      }

      case 'tag': {
        if (!action.tagId) {
          throw new BadRequestException(
            'tagId is required.',
          );
        }

        const result =
          await this.model.updateMany(
            filter,
            {
              $addToSet: {
                tags: String(
                  action.tagId,
                ),
              },
              $set: {
                lastEngagedAt:
                  new Date(),
              },
            },
          );

        return {
          success: true,
          modified:
            result.modifiedCount,
        };
      }

      case 'untag': {
        if (!action.tagId) {
          throw new BadRequestException(
            'tagId is required.',
          );
        }

        const result =
          await this.model.updateMany(
            filter,
            {
              $pull: {
                tags: String(
                  action.tagId,
                ),
              },
              $set: {
                lastEngagedAt:
                  new Date(),
              },
            },
          );

        return {
          success: true,
          modified:
            result.modifiedCount,
        };
      }

      case 'delete': {
        const result =
          await this.model.deleteMany(
            filter,
          );

        return {
          success: true,
          deleted:
            result.deletedCount ?? 0,
        };
      }

      default:
        throw new BadRequestException(
          'Unsupported bulk contact action.',
        );
    }
  }

  // ===========================================================================
  // CSV import
  // ===========================================================================

  async importCsv(
    csv: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (
      !csv ||
      !csv.trim()
    ) {
      throw new BadRequestException(
        'CSV data is required.',
      );
    }

    const rows =
      this.parseCsv(csv);

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const email =
        String(
          row.email ?? '',
        )
          .trim()
          .toLowerCase();

      if (!email) {
        skipped++;
        continue;
      }

      try {
        const existing =
          await this.model.findOne({
            email,
            workspaceId,
          });

        if (existing) {
          skipped++;
          continue;
        }

        const contact =
          await this.model.create({
            email,

            firstName:
              row.first_name ??
              row.firstname ??
              '',

            lastName:
              row.last_name ??
              row.lastname ??
              '',

            phone:
              row.phone ?? '',

            location:
              row.location ?? '',

            status:
              this.normalizeStatus(
                row.status ??
                  'subscribed',
              ),

            ownerId,
            workspaceId,

            tags: [],
            audienceIds: [],
            customFields: {},

            revenue: 0,
            orderCount: 0,
            vip: false,

            activity: [],
            purchases: [],
          });

        if (contact) {
          imported++;
        }
      } catch (error: any) {
        if (
          error?.code === 11000
        ) {
          skipped++;
          continue;
        }

        throw error;
      }
    }

    return {
      imported,
      skipped,
      total: rows.length,
    };
  }

  // ===========================================================================
  // Simple CSV parser
  // ===========================================================================

  private parseCsv(
    csv: string,
  ): Record<string, string>[] {
    const lines =
      csv
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter(
          (line) =>
            line.trim().length > 0,
        );

    if (lines.length < 2) {
      return [];
    }

    const headers =
      this.parseCsvLine(
        lines[0],
      ).map((header) =>
        header
          .trim()
          .toLowerCase(),
      );

    return lines
      .slice(1)
      .map((line) => {
        const values =
          this.parseCsvLine(
            line,
          );

        const row: Record<
          string,
          string
        > = {};

        headers.forEach(
          (header, index) => {
            row[header] =
              values[index] ?? '';
          },
        );

        return row;
      });
  }

  private parseCsvLine(
    line: string,
  ): string[] {
    const values: string[] = [];

    let current = '';
    let quoted = false;

    for (
      let i = 0;
      i < line.length;
      i++
    ) {
      const char = line[i];

      if (char === '"') {
        if (
          quoted &&
          line[i + 1] === '"'
        ) {
          current += '"';
          i++;
        } else {
          quoted = !quoted;
        }

        continue;
      }

      if (
        char === ',' &&
        !quoted
      ) {
        values.push(
          current.trim(),
        );

        current = '';
        continue;
      }

      current += char;
    }

    values.push(
      current.trim(),
    );

    return values;
  }
}