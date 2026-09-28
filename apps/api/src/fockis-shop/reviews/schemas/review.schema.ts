import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ReviewDocument = HydratedDocument<Review>;

@Schema({
timestamps: true,
collection: "fockis_shop_reviews",
})
export class Review {
@Prop({
type: Types.ObjectId,
ref: "Product",
required: true,
index: true,
})
productId!: Types.ObjectId;

@Prop({
type: Types.ObjectId,
ref: "User",
required: true,
index: true,
})
authorId!: Types.ObjectId;

@Prop({
type: String,
required: true,
trim: true,
})
authorName!: string;

@Prop({
type: String,
default: null,
trim: true,
})
authorAvatarUrl?: string | null;

@Prop({
type: Number,
required: true,
min: 1,
max: 5,
})
rating!: number;

@Prop({
type: String,
default: null,
trim: true,
})
title?: string | null;

@Prop({
type: String,
default: "",
trim: true,
})
body!: string;

@Prop({
type: Boolean,
default: false,
})
verifiedPurchase!: boolean;

@Prop({
type: Number,
default: 0,
min: 0,
})
helpfulCount!: number;

@Prop({
type: String,
default: null,
trim: true,
})
sellerReplyBody?: string | null;

@Prop({
type: Date,
default: null,
})
sellerReplyCreatedAt?: Date | null;

/*

* These fields are created automatically by
* Mongoose because timestamps: true is enabled.
*
* They are declared here so TypeScript also
* knows that they exist.
  */
  createdAt!: Date;

updatedAt!: Date;
}

export const ReviewSchema =
SchemaFactory.createForClass(Review);

ReviewSchema.index({
productId: 1,
createdAt: -1,
});

ReviewSchema.index({
productId: 1,
rating: 1,
});

ReviewSchema.index(
{
productId: 1,
authorId: 1,
},
{
unique: true,
},
);
