import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

import {
  PURCHASE_STATUSES,
  type PurchaseStatus,
} from '../constants/playlist.constants';


/**
 * Records a single purchase/unlock of a paid,
 * premium, or exclusive playlist.
 *
 * A completed purchase is the source of truth for
 * whether the current user has access to the playlist.
 *
 * Payment providers such as Stripe can transition
 * pending purchases to completed or failed through
 * a webhook.
 */
@Schema({
  timestamps: true,
})
export class PlaylistPurchase {
  /**
   * User who purchased the playlist.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;


  /**
   * Playlist that was purchased.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Playlist',
    required: true,
    index: true,
  })
  playlistId!: Types.ObjectId;


  /**
   * Purchase amount.
   */
  @Prop({
    required: true,
    min: 0,
  })
  amount!: number;


  /**
   * Currency used for the purchase.
   */
  @Prop({
    default: 'USD',
  })
  currency!: string;


  /**
   * Payment state.
   */
  @Prop({
    required: true,
    enum: PURCHASE_STATUSES,
    default: 'pending',
    index: true,
  })
  status!: PurchaseStatus;


  /**
   * Payment provider, for example Stripe.
   */
  @Prop()
  paymentProvider?: string;


  /**
   * Provider-specific payment/session/reference ID.
   */
  @Prop()
  paymentReference?: string;
}


export type PlaylistPurchaseDocument =
  PlaylistPurchase & Document;


export const PlaylistPurchaseSchema =
  SchemaFactory.createForClass(
    PlaylistPurchase,
  );


/**
 * Useful for checking a user's purchase state
 * for a specific playlist.
 */
PlaylistPurchaseSchema.index(
  {
    userId: 1,
    playlistId: 1,
    status: 1,
  },
);