import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Trip,
  TripDocument,
} from './trip.schema';

import {
  AddTripItemDto,
  CreateTripDto,
} from './dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name)
    private readonly model: Model<TripDocument>,
  ) {}

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    userId: string,
    dto: CreateTripDto,
  ) {
    this.validateUserId(userId);

    const name =
      typeof dto.name === 'string'
        ? dto.name.trim()
        : '';

    const title =
      typeof dto.title === 'string'
        ? dto.title.trim()
        : '';

    const finalName =
      name ||
      title;

    if (!finalName) {
      throw new BadRequestException(
        'Trip name or title is required',
      );
    }

    const trip = await this.model.create({
      userId: new Types.ObjectId(userId),

      name: finalName,

      title:
        title ||
        finalName,

      destination:
        normalizeString(
          dto.destination,
        ),

      description:
        normalizeString(
          dto.description,
        ),

      startDate:
        dto.startDate
          ? new Date(dto.startDate)
          : undefined,

      endDate:
        dto.endDate
          ? new Date(dto.endDate)
          : undefined,

      status:
        normalizeStatus(
          dto.status,
        ),

      items:
        Array.isArray(dto.items)
          ? dto.items
          : [],

      bookingIds: [],

      metadata: {},
    });

    return normalizeTripResponse(
      trip.toObject(),
    );
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async list(
    userId: string,
  ) {
    this.validateUserId(userId);

    const trips =
      await this.model
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .sort({
          startDate: 1,
          createdAt: -1,
        })
        .lean();

    return trips.map(
      normalizeTripResponse,
    );
  }

  /* ==========================================================================
     FIND ONE
  ========================================================================== */

  async one(
    userId: string,
    id: string,
  ) {
    this.validateUserId(userId);

    this.validateTripId(id);

    const trip =
      await this.model
        .findOne({
          _id:
            new Types.ObjectId(id),

          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .lean();

    if (!trip) {
      throw new NotFoundException(
        'Trip not found',
      );
    }

    return normalizeTripResponse(
      trip,
    );
  }

  /* ==========================================================================
     ADD ITEM
  ========================================================================== */

  async addItem(
    userId: string,
    id: string,
    dto: AddTripItemDto,
  ) {
    this.validateUserId(userId);

    this.validateTripId(id);

    const item =
      normalizeTripItem(dto);

    const trip =
      await this.model.findOneAndUpdate(
        {
          _id:
            new Types.ObjectId(id),

          userId:
            new Types.ObjectId(
              userId,
            ),
        },

        {
          $push: {
            items: item,
          },
        },

        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!trip) {
      throw new NotFoundException(
        'Trip not found',
      );
    }

    return normalizeTripResponse(
      trip,
    );
  }

  /* ==========================================================================
     REMOVE ITEM
  ========================================================================== */

  async removeItem(
    userId: string,
    id: string,
    index: number,
  ) {
    this.validateUserId(userId);

    this.validateTripId(id);

    if (
      !Number.isInteger(index) ||
      index < 0
    ) {
      throw new BadRequestException(
        'Trip item index must be a valid non-negative integer',
      );
    }

    const trip =
      await this.model.findOne({
        _id:
          new Types.ObjectId(id),

        userId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!trip) {
      throw new NotFoundException(
        'Trip not found',
      );
    }

    if (
      index >= trip.items.length
    ) {
      throw new NotFoundException(
        'Trip item not found',
      );
    }

    trip.items.splice(
      index,
      1,
    );

    const saved =
      await trip.save();

    return normalizeTripResponse(
      saved.toObject(),
    );
  }

  /* ==========================================================================
     UPDATE STATUS
  ========================================================================== */

  async updateStatus(
    userId: string,
    id: string,
    status: string,
  ) {
    this.validateUserId(userId);

    this.validateTripId(id);

    const normalized =
      normalizeStatus(status);

    const trip =
      await this.model
        .findOneAndUpdate(
          {
            _id:
              new Types.ObjectId(id),

            userId:
              new Types.ObjectId(
                userId,
              ),
          },

          {
            $set: {
              status: normalized,
            },
          },

          {
            new: true,
            runValidators: true,
          },
        )
        .lean();

    if (!trip) {
      throw new NotFoundException(
        'Trip not found',
      );
    }

    return normalizeTripResponse(
      trip,
    );
  }

  /* ==========================================================================
     VALIDATION
  ========================================================================== */

  private validateUserId(
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }
  }

  private validateTripId(
    id: string,
  ) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        'Trip not found',
      );
    }
  }
}

/* ============================================================================
   RESPONSE NORMALIZATION
============================================================================ */

function normalizeTripResponse(
  trip: any,
) {
  const id =
    trip?._id?.toString?.() ??
    trip?.id ??
    null;

  const name =
    normalizeString(
      trip?.name,
    ) ||
    normalizeString(
      trip?.title,
    ) ||
    normalizeString(
      trip?.destination,
    ) ||
    'Untitled trip';

  const title =
    normalizeString(
      trip?.title,
    ) ||
    name;

  const items =
    Array.isArray(
      trip?.items,
    )
      ? trip.items.map(
          normalizeTripItem,
        )
      : [];

  const status =
    normalizeStatus(
      trip?.status,
    );

  return {
    ...trip,

    _id:
      trip?._id,

    id,

    name,

    title,

    destination:
      normalizeString(
        trip?.destination,
      ),

    description:
      normalizeString(
        trip?.description,
      ),

    startDate:
      trip?.startDate,

    endDate:
      trip?.endDate,

    status,

    items,

    bookingIds:
      Array.isArray(
        trip?.bookingIds,
      )
        ? trip.bookingIds
        : [],

    metadata:
      isPlainObject(
        trip?.metadata,
      )
        ? trip.metadata
        : {},
  };
}

/* ============================================================================
   ITEM NORMALIZATION
============================================================================ */

function normalizeTripItem(
  item: any,
) {
  const title =
    normalizeString(
      item?.title,
    ) ||
    normalizeString(
      item?.name,
    ) ||
    normalizeString(
      item?.label,
    ) ||
    normalizeString(
      item?.type,
    ) ||
    normalizeString(
      item?.category,
    ) ||
    'Trip item';

  return {
    ...item,

    kind:
      normalizeString(
        item?.kind,
      ) ||
      normalizeString(
        item?.type,
      ) ||
      'item',

    title,

    label:
      normalizeString(
        item?.label,
      ) ||
      title,

    name:
      normalizeString(
        item?.name,
      ) ||
      title,

    category:
      normalizeString(
        item?.category,
      ),

    listingId:
      normalizeString(
        item?.listingId,
      ),

    bookingId:
      normalizeString(
        item?.bookingId,
      ),

    startAt:
      item?.startAt,

    endAt:
      item?.endAt,

    notes:
      normalizeString(
        item?.notes,
      ),

    metadata:
      isPlainObject(
        item?.metadata,
      )
        ? item.metadata
        : {},
  };
}

/* ============================================================================
   STATUS NORMALIZATION
============================================================================ */

function normalizeStatus(
  status?: string,
): string {
  const value =
    String(
      status ?? '',
    )
      .trim()
      .toLowerCase();

  if (
    value === 'completed' ||
    value === 'complete' ||
    value === 'past' ||
    value === 'finished'
  ) {
    return 'completed';
  }

  if (
    value === 'cancelled' ||
    value === 'canceled'
  ) {
    return 'cancelled';
  }

  if (
    value === 'upcoming' ||
    value === 'booked'
  ) {
    return 'upcoming';
  }

  return 'planning';
}

/* ============================================================================
   STRING HELPER
============================================================================ */

function normalizeString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== 'string'
  ) {
    return undefined;
  }

  const result =
    value.trim();

  return result || undefined;
}

/* ============================================================================
   OBJECT HELPER
============================================================================ */

function isPlainObject(
  value: unknown,
): value is Record<string, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}