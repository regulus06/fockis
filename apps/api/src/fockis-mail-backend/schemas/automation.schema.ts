import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

import {
  AutomationStatus,
} from '../enums/fockis-mail.enums';

export type AutomationDocument =
  HydratedDocument<Automation>;

@Schema({
  timestamps: true,
  collection: 'fockis_mail_automations',
})
export class Automation {
  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  })
  name: string;

  @Prop({
    enum: AutomationStatus,
    default: AutomationStatus.DRAFT,
    index: true,
  })
  status: AutomationStatus;

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  trigger: string;

  @Prop({
    type: [Object],
    default: [],
  })
  nodes: Record<string, any>[];

  @Prop({
    type: [Object],
    default: [],
  })
  edges: Record<string, any>[];

  /**
   * Existing database field.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  enrolled: number;

  /**
   * Frontend-compatible contact count.
   * Kept separately so existing consumers of enrolled
   * continue working.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  contacts: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  emails: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  conversionRate: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  revenue: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Journey',
    default: null,
    index: true,
  })
  journeyId?: Types.ObjectId | null;

  @Prop({
    required: true,
    index: true,
    type: Types.ObjectId,
  })
  ownerId: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  workspaceId: string;
}

export const AutomationSchema =
  SchemaFactory.createForClass(
    Automation,
  );

AutomationSchema.index({
  ownerId: 1,
  workspaceId: 1,
  createdAt: -1,
});

AutomationSchema.index({
  ownerId: 1,
  workspaceId: 1,
  status: 1,
});

AutomationSchema.index({
  ownerId: 1,
  workspaceId: 1,
  journeyId: 1,
});