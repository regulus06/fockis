import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PriceAlertDocument =
  HydratedDocument<PriceAlert>;

@Schema({ timestamps: true })
export class PriceAlert {
  // ==========================================================================
  // OWNER
  // ==========================================================================

  /**
   * Keep userId as a string because the Travel authentication system may use
   * MongoDB ObjectIds OR application IDs such as:
   *
   * dev-user
   * demo-user-id
   * other JWT subject identifiers
   */
  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  userId!: string;

  // ==========================================================================
  // DESTINATION
  // ==========================================================================

  /**
   * The frontend creates alerts using:
   *
   * {
   *   destination: string,
   *   targetPrice: number
   * }
   */
  @Prop({
    required: true,
    trim: true,
  })
  destination!: string;

  // ==========================================================================
  // OPTIONAL LISTING
  // ==========================================================================

  /**
   * Kept as a string for frontend compatibility.
   *
   * This can contain:
   * - a MongoDB ObjectId
   * - a listing slug
   * - another application listing identifier
   */
  @Prop({
    trim: true,
  })
  listingId?: string;

  @Prop({
    trim: true,
  })
  listingName?: string;

  // ==========================================================================
  // PRICE INFORMATION
  // ==========================================================================

  @Prop()
  originalPrice?: number;

  @Prop()
  currentPrice?: number;

  @Prop({
    required: true,
    min: 0,
  })
  targetPrice!: number;

  @Prop({
    required: true,
    default: '$',
    trim: true,
  })
  currency!: string;

  // ==========================================================================
  // STATUS
  // ==========================================================================

  @Prop({
    default: false,
    index: true,
  })
  paused!: boolean;

  @Prop({
    default: true,
    index: true,
  })
  active!: boolean;

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  @Prop()
  lastNotifiedAt?: Date;

  // ==========================================================================
  // OPTIONAL TRAVEL INFORMATION
  // ==========================================================================

  @Prop()
  checkIn?: string;

  @Prop()
  checkOut?: string;

  @Prop()
  guests?: number;

  // ==========================================================================
  // FLEXIBLE DATA
  // ==========================================================================

  @Prop({
    type: Object,
    default: {},
  })
  metadata!: Record<string, unknown>;
}

export const PriceAlertSchema =
  SchemaFactory.createForClass(PriceAlert);

// ============================================================================
// INDEXES
// ============================================================================

PriceAlertSchema.index({
  userId: 1,
  createdAt: -1,
});

PriceAlertSchema.index({
  userId: 1,
  active: 1,
});

PriceAlertSchema.index({
  userId: 1,
  paused: 1,
});