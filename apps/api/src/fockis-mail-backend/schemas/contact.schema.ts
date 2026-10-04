import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ContactStatus } from '../enums/fockis-mail.enums';

export type ContactDocument = HydratedDocument<Contact>;

@Schema({
  _id: false,
})
export class ContactActivity {
  @Prop({
    required: true,
  })
  id: string;

  @Prop({
    required: true,
  })
  kind: string;

  @Prop({
    required: true,
  })
  label: string;

  @Prop({
    required: true,
  })
  at: Date;
}

export const ContactActivitySchema =
  SchemaFactory.createForClass(ContactActivity);

@Schema({
  _id: false,
})
export class ContactPurchase {
  @Prop({
    required: true,
  })
  id: string;

  @Prop({
    required: true,
  })
  product: string;

  @Prop({
    required: true,
  })
  at: Date;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  amount: number;
}

export const ContactPurchaseSchema =
  SchemaFactory.createForClass(ContactPurchase);

@Schema({
  timestamps: true,
  collection: 'fockis_mail_contacts',
})
export class Contact {
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    trim: true,
    default: '',
  })
  firstName?: string;

  @Prop({
    trim: true,
    default: '',
  })
  lastName?: string;

  @Prop({
    trim: true,
    default: '',
  })
  phone?: string;

  @Prop({
    trim: true,
    default: '',
  })
  location?: string;

  @Prop({
    enum: ContactStatus,
    default: ContactStatus.SUBSCRIBED,
    index: true,
  })
  status: ContactStatus;

  /**
   * Contact tag IDs.
   *
   * The frontend calls these `tagIds`.
   * MongoDB stores them as `tags`.
   */
  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  tags: string[];

  /**
   * Audience IDs assigned to the contact.
   */
  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  audienceIds: string[];

  /**
   * Custom contact fields.
   */
  @Prop({
    type: Object,
    default: {},
  })
  customFields: Record<string, any>;

  /**
   * Lifetime revenue.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  revenue: number;

  /**
   * Number of purchases/orders.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  orderCount: number;

  /**
   * VIP contact.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  vip: boolean;

  /**
   * Last engagement timestamp.
   */
  @Prop()
  lastEngagedAt?: Date;

  /**
   * Contact timeline.
   */
  @Prop({
    type: [ContactActivitySchema],
    default: [],
  })
  activity: ContactActivity[];

  /**
   * Contact purchases.
   */
  @Prop({
    type: [ContactPurchaseSchema],
    default: [],
  })
  purchases: ContactPurchase[];

  /**
   * Owning authenticated Fockis user.
   */
  @Prop({
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  /**
   * Fockis Mail workspace/business.
   */
  @Prop({
    required: true,
    index: true,
  })
  workspaceId: string;
}

export const ContactSchema =
  SchemaFactory.createForClass(Contact);

/**
 * One email can exist once per workspace.
 */
ContactSchema.index(
  {
    workspaceId: 1,
    email: 1,
  },
  {
    unique: true,
  },
);

/**
 * Audience filtering.
 */
ContactSchema.index({
  ownerId: 1,
  workspaceId: 1,
  status: 1,
});

ContactSchema.index({
  ownerId: 1,
  workspaceId: 1,
  audienceIds: 1,
});

ContactSchema.index({
  ownerId: 1,
  workspaceId: 1,
  tags: 1,
});

ContactSchema.index({
  ownerId: 1,
  workspaceId: 1,
  createdAt: -1,
});

ContactSchema.index({
  ownerId: 1,
  workspaceId: 1,
  lastEngagedAt: -1,
});