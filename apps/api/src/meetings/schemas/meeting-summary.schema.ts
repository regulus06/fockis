import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export type MeetingSummaryDocument =
  HydratedDocument<MeetingSummary>;

// ============================================================================
// MEETING SUMMARY
// ============================================================================

@Schema({
  timestamps: true,
  collection: "meeting_summaries",
})
export class MeetingSummary {
  // --------------------------------------------------------------------------
  // MEETING ID
  // --------------------------------------------------------------------------

  @Prop({
    type: Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  // --------------------------------------------------------------------------
  // OVERVIEW
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    default: "",
  })
  overview!: string;

  // --------------------------------------------------------------------------
  // MAIN POINTS
  // --------------------------------------------------------------------------

  @Prop({
    type: [String],
    default: [],
  })
  mainPoints!: string[];

  // --------------------------------------------------------------------------
  // DECISIONS
  // --------------------------------------------------------------------------

  @Prop({
    type: [
      {
        id: {
          type: String,
          required: true,
        },

        text: {
          type: String,
          required: true,
        },
      },
    ],
    default: [],
  })
  decisions!: {
    id: string;
    text: string;
  }[];

  // --------------------------------------------------------------------------
  // ACTION ITEMS
  // --------------------------------------------------------------------------

  @Prop({
    type: [
      {
        id: {
          type: String,
          required: true,
        },

        assigneeId: {
          type: String,
          required: false,
        },

        assigneeName: {
          type: String,
          required: false,
        },

        task: {
          type: String,
          required: true,
        },

        dueDate: {
          type: String,
          required: false,
        },

        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    default: [],
  })
  actionItems!: {
    id: string;
    assigneeId?: string;
    assigneeName?: string;
    task: string;
    dueDate?: string;
    completed: boolean;
  }[];

  // --------------------------------------------------------------------------
  // QUESTIONS
  // --------------------------------------------------------------------------

  @Prop({
    type: [
      {
        id: {
          type: String,
          required: true,
        },

        text: {
          type: String,
          required: true,
        },

        answered: {
          type: Boolean,
          default: false,
        },
      },
    ],
    default: [],
  })
  questions!: {
    id: string;
    text: string;
    answered: boolean;
  }[];

  // --------------------------------------------------------------------------
  // NEXT STEPS
  // --------------------------------------------------------------------------

  @Prop({
    type: [String],
    default: [],
  })
  nextSteps!: string[];

  // --------------------------------------------------------------------------
  // GENERATED AT
  // --------------------------------------------------------------------------

  @Prop({
    type: Date,
    default: Date.now,
  })
  generatedAt!: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

export const MeetingSummarySchema =
  SchemaFactory.createForClass(
    MeetingSummary,
  );