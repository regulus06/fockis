import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";

import {
  GiftsService,
} from "./gifts.service";

import {
  CreateGiftDto,
} from "./dto/create-gift.dto";

import {
  SendGiftDto,
} from "./dto/send-gift.dto";


@Controller("gifts")
export class GiftsController {

  constructor(
    private readonly giftsService:
      GiftsService,
  ) {}


  // ============================================================
  // GET ALL AVAILABLE GIFTS
  //
  // GET /gifts
  // ============================================================

  @Get()
  async getGifts() {

    return this.giftsService.getGifts();

  }


  // ============================================================
  // GET POST GIFT SENDERS
  //
  // GET /gifts/post/:postId/senders
  //
  // Returns every gift transaction for a post, newest first,
  // with sender username/avatar populated. Powers the "who
  // sent this" popover when a viewer taps the gift count on
  // a post's action bar.
  //
  // IMPORTANT:
  // This MUST be declared BEFORE the generic GET /:id route
  // below. NestJS matches routes in declaration order, so if
  // GET /:id came first, a request to /gifts/post/123/senders
  // would incorrectly match /:id with id="post" instead.
  // ============================================================

  @Get("post/:postId/senders")
  async getPostGiftSenders(
    @Param("postId")
    postId: string,
  ) {

    return this.giftsService.getPostGiftSenders(
      postId,
    );

  }


  // ============================================================
  // GET SINGLE GIFT
  //
  // GET /gifts/:id
  //
  // IMPORTANT: keep this AFTER /post/:postId/senders above.
  // ============================================================

  @Get(":id")
  async getGift(
    @Param("id")
    id: string,
  ) {

    return this.giftsService.getGift(
      id,
    );

  }


  // ============================================================
  // CREATE GIFT
  //
  // ADMIN
  //
  // POST /gifts/create
  // ============================================================

  @Post("create")
  async createGift(
    @Body()
    dto: CreateGiftDto,
  ) {

    return this.giftsService.createGift(
      dto,
    );

  }


  // ============================================================
  // SEND LIVE GIFT
  //
  // POST /gifts/send
  //
  // Flow:
  //
  // 1. Validate sender
  // 2. Validate receiver
  // 3. Find gift
  // 4. Atomically deduct sender coins
  // 5. Create gift transaction
  // 6. Credit receiver coins
  // 7. Update creator earnings
  // 8. Persist giftsCount on the post
  // 9. Broadcast LIVE animation
  // ============================================================

  @Post("send")
  async sendGift(
    @Body()
    dto: SendGiftDto,
  ) {

    return this.giftsService.sendGift(
      dto,
    );

  }

}