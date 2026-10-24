
import {
  Controller,
  Get,
  Param,
} from "@nestjs/common";

import { Public } from "../../../auth/public.decorator";
import { ReviewsService } from "../services/reviews.service";

@Controller("fockis-shop/reviews")
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

  @Public()
  @Get("product/:productId")
  async getProductReviews(
    @Param("productId") productId: string,
  ) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Public()
  @Get("product/:productId/summary")
  async getProductReviewSummary(
    @Param("productId") productId: string,
  ) {
    return this.reviewsService.getProductReviewSummary(productId);
  }
}
