import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";

import { StoriesService } from "./stories.service";

@Controller("stories")
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
  ) {}

  // ==========================================================================
  // GET ACTIVE STORIES
  // GET /stories
  // ==========================================================================

  @Get()
  async getStories() {
    return this.storiesService.findAll();
  }

  // ==========================================================================
  // CREATE STORY
  // POST /stories
  // ==========================================================================

  @Post()
  async createStory(@Body() body: any) {
    if (!body.userId) {
      throw new BadRequestException(
        "User ID is required",
      );
    }

    if (!body.media) {
      throw new BadRequestException(
        "Story media is required",
      );
    }

    const user = {
      userId: String(body.userId),

      username:
        body.username ||
        "User",

      avatar:
        body.avatar ||
        null,
    };

    return this.storiesService.create(
      body,
      user,
    );
  }

  // ==========================================================================
  // DELETE ALL CURRENT USER STORIES
  // DELETE /stories/user/all
  // ==========================================================================

  @Delete("user/all")
  async deleteAllStories(
    @Body() body: any,
  ) {
    if (!body.userId) {
      throw new BadRequestException(
        "User ID is required",
      );
    }

    return this.storiesService.deleteAll({
      userId: String(body.userId),
    });
  }

  // ==========================================================================
  // DELETE ONE STORY
  // DELETE /stories/:id
  // ==========================================================================

  @Delete(":id")
  async deleteStory(
    @Param("id") id: string,
    @Body() body: any,
  ) {
    if (!body.userId) {
      throw new BadRequestException(
        "User ID is required",
      );
    }

    return this.storiesService.delete(
      id,
      {
        userId: String(body.userId),
      },
    );
  }
}