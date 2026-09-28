import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
} from "mongoose";

export type CategoryDocument =
  Category & Document;

/* ============================================================================
   CATEGORY
============================================================================ */

@Schema({
  timestamps: true,
})
export class Category {
  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  slug!: string;

  @Prop({
    default: "",
    trim: true,
  })
  description!: string;

  /* ==========================================================================
     CATEGORY IMAGE / ICON
  ========================================================================== */

  @Prop({
    default: "",
    trim: true,
  })
  image!: string;

  @Prop({
    default: "",
    trim: true,
  })
  icon!: string;

  /* ==========================================================================
     CATEGORY STATUS
  ========================================================================== */

  @Prop({
    enum: [
      "active",
      "inactive",
    ],
    default: "active",
    index: true,
  })
  status!: string;

  /* ==========================================================================
     DISPLAY ORDER
  ========================================================================== */

  @Prop({
    default: 0,
    index: true,
  })
  sortOrder!: number;

  /* ==========================================================================
     PRODUCT COUNT
  ========================================================================== */

  @Prop({
    default: 0,
    min: 0,
  })
  productCount!: number;

  /* ==========================================================================
     FEATURED CATEGORY
  ========================================================================== */

  @Prop({
    default: false,
    index: true,
  })
  featured!: boolean;

  /* ==========================================================================
     PARENT CATEGORY
  ========================================================================== */

  @Prop({
    type: String,
    default: null,
    index: true,
  })
  parentId!: string | null;

  /* ==========================================================================
     SEO
  ========================================================================== */

  @Prop({
    default: "",
    trim: true,
  })
  metaTitle!: string;

  @Prop({
    default: "",
    trim: true,
  })
  metaDescription!: string;

  /* ==========================================================================
     TIMESTAMPS
  ========================================================================== */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const CategorySchema =
  SchemaFactory.createForClass(Category);

/* ============================================================================
   INDEXES
============================================================================ */

CategorySchema.index({
  status: 1,
  sortOrder: 1,
});

CategorySchema.index({
  status: 1,
  featured: 1,
});

CategorySchema.index({
  parentId: 1,
  status: 1,
});