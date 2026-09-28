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
  LiveComment,
  LiveCommentDocument,
} from "../schemas/live-comment.schema";

@Injectable()
export class LiveCommentService {
  constructor(
    @InjectModel(LiveComment.name)
    private readonly commentModel:
      Model<LiveCommentDocument>,
  ) {}

  async create(params: {
    streamId: string;
    userId: string;
    message: string;
    userName?: string;
    userAvatar?: string;
  }) {
    const message =
      params.message
        .trim()
        .slice(0, 500);

    if (!message) {
      return null;
    }

    const comment =
      await this.commentModel.create({
        streamId: params.streamId,
        userId: params.userId,
        message,
        userName:
          params.userName?.trim().slice(0, 150) ||
          "Fockis User",
        userAvatar:
          params.userAvatar || "",
      });

    return this.serialize(comment);
  }

  async findLatest(
    streamId: string,
  ) {
    const items =
      await this.commentModel
        .find({ streamId })
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    return items
      .reverse()
      .map((item) =>
        this.serialize(item),
      );
  }

  private serialize(item: any) {
    return {
      id: String(item._id),
      _id: String(item._id),
      streamId: String(
        item.streamId,
      ),
      userId: String(
        item.userId,
      ),
      message: item.message,
      userName:
        item.userName ||
        "Fockis User",
      userAvatar:
        item.userAvatar || "",
      createdAt:
        item.createdAt,
    };
  }
}