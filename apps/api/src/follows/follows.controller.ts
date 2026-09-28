import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { Request } from "express";

import { FollowsService } from "./follows.service";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

interface AuthenticatedRequest
  extends Request {
  user: {
    _id?: string;
    id?: string;
    sub?: string;
  };
}

@Controller("follows")
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
  ) {}

  private getUserId(req: AuthenticatedRequest): string {
    const id =
      req.user?.sub ??
      req.user?._id ??
      req.user?.id;

    if (!id) {
      throw new Error(
        "Authenticated user ID was not found",
      );
    }

    return String(id);
  }

  @Post(":userId")
  async follow(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.followsService.follow(
      this.getUserId(req),
      userId,
    );
  }

  @Delete(":userId")
  async unfollow(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.followsService.unfollow(
      this.getUserId(req),
      userId,
    );
  }

  @Get(":userId/status")
  async status(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.followsService.getStatus(
      this.getUserId(req),
      userId,
    );
  }

  @Get(":userId/followers")
  async followers(
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.followsService.getFollowers(
      userId,
      Number(page) || 1,
      Number(limit) || 30,
    );
  }

  @Get(":userId/following")
  async following(
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.followsService.getFollowing(
      userId,
      Number(page) || 1,
      Number(limit) || 30,
    );
  }

  @Get(":userId/counts")
  async counts(
    @Param("userId") userId: string,
  ) {
    return this.followsService.getCounts(userId);
  }
}