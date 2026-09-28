import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

// ============================================================================
// EVENT DOCUMENT TYPE
// ============================================================================

export type EventDocument = HydratedDocument<Event> & {
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// EVENT VISIBILITY
// ============================================================================

export enum EventVisibility {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
}

// ============================================================================
// EVENT CATEGORY
// ============================================================================

export enum EventCategory {
  GENERAL = 'general',
  MUSIC = 'music',
  SPORTS = 'sports',
  BUSINESS = 'business',
  EDUCATION = 'education',
  FOOD = 'food',
  COMMUNITY = 'community',
  PARTY = 'party',
  CONFERENCE = 'conference',
  OTHER = 'other',
}

// ============================================================================
// EVENT STATUS
// ============================================================================

export enum EventStatus {
  UPCOMING = 'upcoming',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
};

// ============================================================================
// EVENT COVER MEDIA TYPE
// ============================================================================
//
// image = image cover
// video = video cover
//
// This allows the frontend to know whether it should render:
//   <img>
// or:
//   <video>
//

export enum EventCoverMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// ============================================================================
// EVENT SCHEMA
// ============================================================================

@Schema({
  timestamps: true,
  collection: 'events',
})
export class Event {
  // ==========================================================================
  // CREATOR
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  creatorId!: Types.ObjectId;

  // ==========================================================================
  // BASIC INFORMATION
  // ==========================================================================

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 150,
  })
  title!: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 5000,
  })
  description?: string;

  // ==========================================================================
  // CATEGORY
  // ==========================================================================

  @Prop({
    type: String,
    enum: Object.values(EventCategory),
    default: EventCategory.GENERAL,
    index: true,
  })
  category!: EventCategory;

  // ==========================================================================
  // VISIBILITY
  // ==========================================================================

  @Prop({
    type: String,
    enum: Object.values(EventVisibility),
    default: EventVisibility.PUBLIC,
    index: true,
  })
  visibility!: EventVisibility;

  // ==========================================================================
  // EVENT DATE / TIME
  // ==========================================================================

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  startDate!: Date;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  endDate!: Date;

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  @Prop({
    required: false,
    trim: true,
    maxlength: 250,
  })
  locationName?: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 1000,
  })
  address?: string;

  @Prop({
    type: Number,
    required: false,
    min: -90,
    max: 90,
  })
  latitude?: number;

  @Prop({
    type: Number,
    required: false,
    min: -180,
    max: 180,
  })
  longitude?: number;

  // ==========================================================================
  // ONLINE EVENT
  // ==========================================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  isOnline!: boolean;

  @Prop({
    required: false,
    trim: true,
    maxlength: 2000,
  })
  onlineUrl?: string;

  // ==========================================================================
  // COVER IMAGE
  // ==========================================================================
  //
  // Existing image support is preserved.
  //
  // Example:
  //
  // /uploads/events/abc123.jpg
  //
  // or:
  //
  // https://example.com/event.jpg
  //

  @Prop({
    required: false,
    trim: true,
    maxlength: 2000,
  })
  coverImageUrl?: string;

  // ==========================================================================
  // COVER VIDEO
  // ==========================================================================
  //
  // Optional uploaded or externally hosted video.
  //
  // Example:
  //
  // /uploads/events/abc123.mp4
  //
  // or:
  //
  // https://example.com/event-video.mp4
  //

  @Prop({
    required: false,
    trim: true,
    maxlength: 2000,
  })
  coverVideoUrl?: string;

  // ==========================================================================
  // COVER MEDIA TYPE
  // ==========================================================================
  //
  // Determines which cover is active.
  //
  // image:
  //   use coverImageUrl
  //
  // video:
  //   use coverVideoUrl
  //

  @Prop({
    type: String,
    enum: Object.values(EventCoverMediaType),
    default: EventCoverMediaType.IMAGE,
  })
  coverMediaType!: EventCoverMediaType;

  // ==========================================================================
  // ATTENDEES
  // ==========================================================================

  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    default: [],
    index: true,
  })
  attendeeIds!: Types.ObjectId[];

  // ==========================================================================
  // CANCELLATION
  // ==========================================================================

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isCancelled!: boolean;

  @Prop({
    type: Date,
    required: false,
  })
  cancelledAt?: Date;
}

// ============================================================================
// CREATE MONGOOSE SCHEMA
// ============================================================================

export const EventSchema =
  SchemaFactory.createForClass(Event);

// ============================================================================
// INDEXES
// ============================================================================

// Event date range
EventSchema.index({
  startDate: 1,
  endDate: 1,
});

// Creator's events
EventSchema.index({
  creatorId: 1,
  startDate: -1,
});

// Public/friends/private events ordered by start date
EventSchema.index({
  visibility: 1,
  startDate: 1,
});

// Category + date
EventSchema.index({
  category: 1,
  startDate: 1,
});

// Upcoming active events
EventSchema.index({
  isCancelled: 1,
  endDate: 1,
});

// Online events
EventSchema.index({
  isOnline: 1,
  startDate: 1,
});

// Cover media
EventSchema.index({
  coverMediaType: 1,
});