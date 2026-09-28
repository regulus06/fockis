import {
Controller,
Get,
Param,
} from "@nestjs/common";

import { ReviewsService } from "../services/reviews.service";

@Controller("marketplace/reviews")
export class ReviewsController {
constructor(
private readonly reviewsService: ReviewsService,
) {}

@Get("product/:productId")
async getProductReviews(
@Param("productId")
productId: string,
) {
return this.reviewsService.getProductReviews(
productId,
);
}

@Get("product/:productId/summary")
async getProductReviewSummary(
@Param("productId")
productId: string,
) {
return this.reviewsService.getProductReviewSummary(
productId,
);
}
}
