import {
Injectable,
NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
Model,
Types,
} from "mongoose";

import {
Review,
ReviewDocument,
} from "../schemas/review.schema";

@Injectable()
export class ReviewsService {
constructor(
@InjectModel(Review.name)
private readonly reviewModel: Model<ReviewDocument>,
) {}

async getProductReviews(productId: string) {
if (!Types.ObjectId.isValid(productId)) {
throw new NotFoundException("Product not found");
}
const reviews = await this.reviewModel
  .find({
    productId: new Types.ObjectId(productId),
  })
  .sort({
    createdAt: -1,
  })
  .lean()
  .exec();

return reviews.map((review) => ({
  id: String(review._id),
  productId: String(review.productId),
  authorId: String(review.authorId),
  authorName: review.authorName,
  authorAvatarUrl: review.authorAvatarUrl ?? null,
  rating: review.rating as 1 | 2 | 3 | 4 | 5,
  title: review.title ?? null,
  body: review.body,
  verifiedPurchase: review.verifiedPurchase,
  helpfulCount: review.helpfulCount ?? 0,
  createdAt:
    review.createdAt instanceof Date
      ? review.createdAt.toISOString()
      : new Date(review.createdAt).toISOString(),
  sellerReply: review.sellerReplyBody
    ? {
        body: review.sellerReplyBody,
        createdAt: review.sellerReplyCreatedAt
          ? new Date(
              review.sellerReplyCreatedAt,
            ).toISOString()
          : new Date(
              review.createdAt,
            ).toISOString(),
      }
    : null,
}));

}

async getProductReviewSummary(productId: string) {
if (!Types.ObjectId.isValid(productId)) {
throw new NotFoundException("Product not found");
}

const objectProductId =
  new Types.ObjectId(productId);

const result = await this.reviewModel.aggregate([
  {
    $match: {
      productId: objectProductId,
    },
  },
  {
    $group: {
      _id: null,
      totalReviews: {
        $sum: 1,
      },
      averageRating: {
        $avg: "$rating",
      },
      ratingBreakdown: {
        $push: "$rating",
      },
    },
  },
]);

if (!result.length) {
  return {
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };
}

const data = result[0];

const ratingBreakdown = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

for (const rating of data.ratingBreakdown) {
  if (rating >= 1 && rating <= 5) {
    ratingBreakdown[
      rating as 1 | 2 | 3 | 4 | 5
    ] += 1;
  }
}

return {
  averageRating: Number(
    Number(data.averageRating ?? 0).toFixed(2),
  ),
  totalReviews: data.totalReviews ?? 0,
  ratingBreakdown,
};

}
}
