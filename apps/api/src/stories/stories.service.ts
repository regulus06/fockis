import {
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  Story,
} from "./story.schema";

import { canonicalStoryMedia } from "./story-media";

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Story.name)
    private readonly model: Model<Story>,
  ) {}

  // ==========================================================================
  // GET ACTIVE STORIES
  // ==========================================================================

  async findAll() {
    const stories = await this.model
      .find({
        expiresAt: {
          $gt: new Date(),
        },
      })
      .sort({
        createdAt: -1,
      })
      .lean()
      .exec();

    // Stories saved before this fix hold signed Google Cloud links; serve
    // them through the API's own media route instead.
    return stories.map((story: any) => ({
      ...story,
      media: canonicalStoryMedia(story.media),
      productImage: story.productImage ? canonicalStoryMedia(story.productImage) : story.productImage,
    }));
  }

  // ==========================================================================
  // CREATE STORY
  // ==========================================================================

  async create(
    data: any,
    user: any,
  ) {
    const expiresAt =
      new Date(
        Date.now() +
          24 *
            60 *
            60 *
            1000,
      );

    return this.model.create({
      userId:
        String(
          user.userId,
        ),

      username:
        user.username ||
        "User",

      avatar:
        user.avatar ||
        null,

      media:
        canonicalStoryMedia(data.media),

      type:
        data.type ===
        "video"
          ? "video"
          : "image",

      isProductStory:
        Boolean(
          data.isProductStory,
        ),

      productId:
        data.productId ||
        null,

      productName:
        data.productName ||
        null,

      productImage:
        data.productImage ||
        null,

      price:
        data.price ??
        null,

      shopLink:
        data.shopLink ||
        null,

      sellerId:
        data.sellerId ||
        null,

      expiresAt,
    });
  }

  // ==========================================================================
  // DELETE ONE STORY
  // ==========================================================================

  async delete(
    id: string,
    user: any,
  ) {
    return this.model.deleteOne({
      _id: id,

      userId:
        String(
          user.userId,
        ),
    });
  }

  // ==========================================================================
  // DELETE ALL USER STORIES
  // ==========================================================================

  async deleteAll(
    user: any,
  ) {
    return this.model.deleteMany({
      userId:
        String(
          user.userId,
        ),
    });
  }
}