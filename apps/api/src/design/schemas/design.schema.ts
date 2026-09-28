// ============================================================================
// FOCKIS DESIGN STUDIO - DESIGN SCHEMA
// ============================================================================

import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

import type {
  DesignCategory,
  DesignDocument,
  DesignElement,
} from "../types/design.types";

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export type DesignDocumentEntity =
  HydratedDocument<Design>;

// ============================================================================
// DESIGN ELEMENT
// ============================================================================

@Schema({
  _id: false,
})
export class DesignElementSchema
  implements DesignElement
{
  // --------------------------------------------------------------------------
  // ID
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
  })
  id!: string;

  // --------------------------------------------------------------------------
  // TYPE
  // --------------------------------------------------------------------------
  // IMPORTANT:
  // DesignElement["type"] is a TypeScript union.
  // Explicitly telling Mongoose this is a String prevents:
  //
  // CannotDetermineTypeError
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    enum: [
      "text",
      "shape",
      "image",
      "icon",
      "line",
    ],
  })
  type!: DesignElement["type"];

  // --------------------------------------------------------------------------
  // POSITION
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  x!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  y!: number;

  // --------------------------------------------------------------------------
  // SIZE
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  width!: number;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  height!: number;

  // --------------------------------------------------------------------------
  // TRANSFORM
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    default: 0,
  })
  rotation?: number;

  @Prop({
    type: Number,
    default: 1,
    min: 0,
    max: 1,
  })
  opacity?: number;

  @Prop({
    type: Number,
    default: 0,
  })
  zIndex?: number;

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  @Prop({
    type: Boolean,
    default: false,
  })
  locked?: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  visible?: boolean;

  // --------------------------------------------------------------------------
  // TEXT
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  content?: string;

  @Prop({
    type: String,
  })
  fontFamily?: string;

  @Prop({
    type: Number,
  })
  fontSize?: number;

  @Prop({
    type: Number,
  })
  fontWeight?: number;

  @Prop({
    type: String,
  })
  color?: string;

  // --------------------------------------------------------------------------
  // TEXT ALIGNMENT
  // --------------------------------------------------------------------------
  // Explicit String because DesignElement["textAlign"] may be a union.
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    enum: [
      "left",
      "center",
      "right",
    ],
  })
  textAlign?: DesignElement["textAlign"];

  // --------------------------------------------------------------------------
  // SHAPE
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  fill?: string;

  @Prop({
    type: String,
  })
  stroke?: string;

  @Prop({
    type: Number,
  })
  strokeWidth?: number;

  @Prop({
    type: Number,
  })
  borderRadius?: number;

  // --------------------------------------------------------------------------
  // IMAGE
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  imageUrl?: string;

  // --------------------------------------------------------------------------
  // ICON
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  iconName?: string;

  // --------------------------------------------------------------------------
  // METADATA
  // --------------------------------------------------------------------------

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DESIGN ELEMENT SCHEMA FACTORY
// ============================================================================

export const DesignElementSchemaFactory =
  SchemaFactory.createForClass(
    DesignElementSchema,
  );

// ============================================================================
// DESIGN CANVAS
// ============================================================================

@Schema({
  _id: false,
})
export class DesignCanvasSchema {
  // --------------------------------------------------------------------------
  // WIDTH
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  width!: number;

  // --------------------------------------------------------------------------
  // HEIGHT
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  height!: number;

  // --------------------------------------------------------------------------
  // BACKGROUND
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    default: "#ffffff",
  })
  background!: string;

  // --------------------------------------------------------------------------
  // BACKGROUND IMAGE
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  backgroundImage?: string;
}

// ============================================================================
// DESIGN CANVAS SCHEMA FACTORY
// ============================================================================

export const DesignCanvasSchemaFactory =
  SchemaFactory.createForClass(
    DesignCanvasSchema,
  );

// ============================================================================
// DESIGN DOCUMENT
// ============================================================================

@Schema({
  _id: false,
})
export class DesignDocumentSchema
  implements DesignDocument
{
  // --------------------------------------------------------------------------
  // CANVAS
  // --------------------------------------------------------------------------

  @Prop({
    type: DesignCanvasSchemaFactory,
    required: true,
  })
  canvas!: DesignCanvasSchema;

  // --------------------------------------------------------------------------
  // ELEMENTS
  // --------------------------------------------------------------------------

  @Prop({
    type: [DesignElementSchemaFactory],
    default: [],
  })
  elements!: DesignElementSchema[];

  // --------------------------------------------------------------------------
  // VERSION
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    default: 1,
  })
  version!: number;
}

// ============================================================================
// DESIGN DOCUMENT SCHEMA FACTORY
// ============================================================================

export const DesignDocumentSchemaFactory =
  SchemaFactory.createForClass(
    DesignDocumentSchema,
  );

// ============================================================================
// DESIGN
// ============================================================================

@Schema({
  timestamps: true,
  collection: "designs",
})
export class Design {
  // --------------------------------------------------------------------------
  // OWNER
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  ownerId!: string;

  // --------------------------------------------------------------------------
  // NAME
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 160,
  })
  name!: string;

  // --------------------------------------------------------------------------
  // CATEGORY
  // --------------------------------------------------------------------------
  // DesignCategory is a TypeScript type/union, so explicitly use String.
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    enum: [
      "logo",
      "flyer",
      "banner",
      "badge",
      "business-card",
      "poster",
      "invitation",
      "certificate",
      "social",
      "menu",
    ],
    index: true,
  })
  category!: DesignCategory;

  // --------------------------------------------------------------------------
  // DESCRIPTION
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  // --------------------------------------------------------------------------
  // THUMBNAIL
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
    trim: true,
  })
  thumbnailUrl?: string;

  // --------------------------------------------------------------------------
  // DOCUMENT
  // --------------------------------------------------------------------------

  @Prop({
    type: DesignDocumentSchemaFactory,
    required: true,
  })
  document!: DesignDocumentSchema;

  // --------------------------------------------------------------------------
  // FAVORITE
  // --------------------------------------------------------------------------

  @Prop({
    type: Boolean,
    index: true,
    default: false,
  })
  favorite!: boolean;

  // --------------------------------------------------------------------------
  // ARCHIVED
  // --------------------------------------------------------------------------

  @Prop({
    type: Boolean,
    index: true,
    default: false,
  })
  archived!: boolean;

  // --------------------------------------------------------------------------
  // SOURCE TEMPLATE
  // --------------------------------------------------------------------------

  @Prop({
    type: String,
  })
  sourceTemplateId?: string;

  // --------------------------------------------------------------------------
  // REVISION
  // --------------------------------------------------------------------------

  @Prop({
    type: Number,
    default: 1,
  })
  revision!: number;

  // --------------------------------------------------------------------------
  // LAST OPENED
  // --------------------------------------------------------------------------

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  lastOpenedAt!: Date;
}

// ============================================================================
// DESIGN SCHEMA FACTORY
// ============================================================================

export const DesignSchema =
  SchemaFactory.createForClass(Design);

// ============================================================================
// INDEXES
// ============================================================================

DesignSchema.index({
  ownerId: 1,
  updatedAt: -1,
});

DesignSchema.index({
  ownerId: 1,
  category: 1,
  archived: 1,
});

DesignSchema.index({
  ownerId: 1,
  name: 1,
});