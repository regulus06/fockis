import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  isValidObjectId,
} from "mongoose";

import {
  LiveProduct,
  LiveStream,
  LiveStreamDocument,
} from "../schemas/live-stream.schema";

import {
  User,
  UserDocument,
} from "../../users/user.schema";

import {
  CreateLiveDto,
  LiveProductDto,
} from "../dto/create-live.dto";

import {
  createLiveRoomName,
} from "../utils/live-room.util";

// ============================================================================
// HOST INFO SHAPE
// ============================================================================

interface HostInfo {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class LiveService {
  constructor(
    @InjectModel(LiveStream.name)
    private readonly liveModel: Model<LiveStreamDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ===========================================================================
  // CREATE
  // ===========================================================================

  async create(
    userId: string,
    dto: CreateLiveDto,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    const title = dto.title?.trim();

    if (!title) {
      throw new BadRequestException(
        "LIVE title is required.",
      );
    }

    const stream = new this.liveModel({
      hostId: userId,

      roomName: "",

      title,

      description:
        dto.description?.trim() || "",

      category:
        dto.category?.trim() || "General",

      thumbnailUrl:
        dto.thumbnailUrl?.trim() || "",

      products:
        dto.products || [],

      status: "live",

      viewerCount: 0,

      peakViewerCount: 0,

      likeCount: 0,

      commentCount: 0,

      shareCount: 0,

      startedAt: new Date(),
    });

    stream.roomName = createLiveRoomName(
      String(stream._id),
    );

    try {
      await stream.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          "Unable to create a unique LIVE room.",
        );
      }

      throw error;
    }

    const hostInfo =
      await this.getHostInfo(userId);

    return this.serialize(
      stream,
      hostInfo,
    );
  }

  // ===========================================================================
  // FIND BY ID
  // ===========================================================================

  async findById(
    streamId: string,
  ) {
    this.assertObjectId(streamId);

    const stream =
      await this.liveModel
        .findById(streamId)
        .lean();

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    const hostInfo =
      await this.getHostInfo(
        String(stream.hostId),
      );

    return this.serialize(
      stream,
      hostInfo,
    );
  }

  // ===========================================================================
  // GET LIVE STREAM DOCUMENT
  // ===========================================================================

  async getLiveStreamDocument(
    streamId: string,
  ): Promise<LiveStreamDocument> {
    this.assertObjectId(streamId);

    const stream =
      await this.liveModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    return stream;
  }

  // ===========================================================================
  // DISCOVERY
  // ===========================================================================

  async getLiveStreams(
    category?: string,
  ) {
    const filter: Record<string, unknown> = {
      status: "live",
    };

    const normalizedCategory =
      category?.trim();

    if (normalizedCategory) {
      filter.category =
        normalizedCategory;
    }

    const streams =
      await this.liveModel
        .find(filter)
        .sort({
          viewerCount: -1,
          createdAt: -1,
        })
        .limit(100)
        .lean();

    const hostInfoMap =
      await this.getHostInfoMap(
        streams.map(
          (stream) =>
            String(stream.hostId),
        ),
      );

    return streams.map(
      (stream) =>
        this.serialize(
          stream,
          hostInfoMap.get(
            String(stream.hostId),
          ),
        ),
    );
  }

  // ===========================================================================
  // MY LIVE STREAMS
  // ===========================================================================

  async getMyLiveStreams(
    userId: string,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    const streams =
      await this.liveModel
        .find({
          hostId: userId,
        })
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    const hostInfo =
      await this.getHostInfo(userId);

    return streams.map(
      (stream) =>
        this.serialize(
          stream,
          hostInfo,
        ),
    );
  }

  // ===========================================================================
  // END LIVE
  // ===========================================================================

  async end(
    userId: string,
    streamId: string,
    _reason?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    this.assertObjectId(streamId);

    const stream =
      await this.liveModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    this.assertHost(
      stream,
      userId,
    );

    if (stream.status === "ended") {
      return this.serialize(stream);
    }

    stream.status = "ended";

    stream.endedAt = new Date();

    stream.viewerCount = 0;

    await stream.save();

    return this.serialize(stream);
  }

  // ===========================================================================
  // DELETE
  // ===========================================================================

  async delete(
    userId: string,
    streamId: string,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    this.assertObjectId(streamId);

    const stream =
      await this.liveModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    this.assertHost(
      stream,
      userId,
    );

    await this.liveModel.deleteOne({
      _id: streamId,
    });

    return {
      deleted: true,
      id: streamId,
    };
  }

  // ===========================================================================
  // SHARE
  // ===========================================================================

  async incrementShare(
    streamId: string,
  ) {
    this.assertObjectId(streamId);

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
        },
        {
          $inc: {
            shareCount: 1,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    return {
      shareCount:
        Number(
          result.shareCount || 0,
        ),
    };
  }

  // ===========================================================================
  // LIKE
  // ===========================================================================

  async incrementLike(
    streamId: string,
    amount = 1,
  ) {
    this.assertObjectId(streamId);

    const safeAmount = Math.trunc(
      Number(amount),
    );

    if (
      !Number.isFinite(safeAmount) ||
      safeAmount === 0
    ) {
      const existing =
        await this.liveModel
          .findById(streamId)
          .select("likeCount")
          .lean();

      if (!existing) {
        throw new NotFoundException(
          "LIVE stream not found.",
        );
      }

      return {
        likeCount:
          Number(
            existing.likeCount || 0,
          ),
      };
    }

    if (safeAmount < 0) {
      const result =
        await this.liveModel.findOneAndUpdate(
          {
            _id: streamId,
            status: "live",
            likeCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              likeCount: safeAmount,
            },
          },
          {
            new: true,
          },
        );

      if (!result) {
        const existing =
          await this.liveModel
            .findById(streamId)
            .select("likeCount")
            .lean();

        if (!existing) {
          throw new NotFoundException(
            "LIVE stream not found.",
          );
        }

        return {
          likeCount:
            Number(
              existing.likeCount || 0,
            ),
        };
      }

      return {
        likeCount:
          Math.max(
            0,
            Number(
              result.likeCount || 0,
            ),
          ),
      };
    }

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
        },
        {
          $inc: {
            likeCount: safeAmount,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    return {
      likeCount:
        Math.max(
          0,
          Number(
            result.likeCount || 0,
          ),
        ),
    };
  }

  // ===========================================================================
  // COMMENT
  // ===========================================================================

  async incrementComment(
    streamId: string,
  ) {
    this.assertObjectId(streamId);

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
        },
        {
          $inc: {
            commentCount: 1,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    return {
      commentCount:
        Number(
          result.commentCount || 0,
        ),
    };
  }

  // ===========================================================================
  // VIEWER COUNT
  // ===========================================================================

  async setViewerCount(
    streamId: string,
    count: number,
  ) {
    this.assertObjectId(streamId);

    const safeCount =
      Math.max(
        0,
        Math.floor(
          Number(count) || 0,
        ),
      );

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
        },
        {
          $set: {
            viewerCount: safeCount,
          },

          $max: {
            peakViewerCount: safeCount,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    return {
      viewerCount:
        Math.max(
          0,
          Number(
            result.viewerCount || 0,
          ),
        ),

      peakViewerCount:
        Math.max(
          0,
          Number(
            result.peakViewerCount || 0,
          ),
        ),
    };
  }

  async incrementViewer(
    streamId: string,
    amount = 1,
  ) {
    this.assertObjectId(streamId);

    const safeAmount =
      Math.max(
        1,
        Math.trunc(
          Number(amount) || 1,
        ),
      );

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
        },
        {
          $inc: {
            viewerCount: safeAmount,
          },

          $max: {
            peakViewerCount: safeAmount,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    const viewerCount =
      Math.max(
        0,
        Number(
          result.viewerCount || 0,
        ),
      );

    // Ensure peakViewerCount reflects the resulting viewer count.
    if (
      viewerCount >
      Number(
        result.peakViewerCount || 0,
      )
    ) {
      const corrected =
        await this.liveModel.findOneAndUpdate(
          {
            _id: streamId,
            status: "live",
          },
          {
            $max: {
              peakViewerCount:
                viewerCount,
            },
          },
          {
            new: true,
          },
        );

      if (corrected) {
        return {
          viewerCount,

          peakViewerCount:
            Math.max(
              0,
              Number(
                corrected.peakViewerCount ||
                  0,
              ),
            ),
        };
      }
    }

    return {
      viewerCount,

      peakViewerCount:
        Math.max(
          0,
          Number(
            result.peakViewerCount || 0,
          ),
        ),
    };
  }

  async decrementViewer(
    streamId: string,
    amount = 1,
  ) {
    this.assertObjectId(streamId);

    const safeAmount =
      Math.max(
        1,
        Math.trunc(
          Number(amount) || 1,
        ),
      );

    const result =
      await this.liveModel.findOneAndUpdate(
        {
          _id: streamId,
          status: "live",
          viewerCount: {
            $gt: 0,
          },
        },
        {
          $inc: {
            viewerCount: -safeAmount,
          },
        },
        {
          new: true,
        },
      );

    if (!result) {
      const existing =
        await this.liveModel
          .findById(streamId)
          .select(
            "viewerCount peakViewerCount",
          )
          .lean();

      if (!existing) {
        throw new NotFoundException(
          "LIVE stream not found.",
        );
      }

      return {
        viewerCount:
          Math.max(
            0,
            Number(
              existing.viewerCount || 0,
            ),
          ),

        peakViewerCount:
          Math.max(
            0,
            Number(
              existing.peakViewerCount || 0,
            ),
          ),
      };
    }

    if (result.viewerCount < 0) {
      result.viewerCount = 0;

      await result.save();
    }

    return {
      viewerCount:
        Math.max(
          0,
          Number(
            result.viewerCount || 0,
          ),
        ),

      peakViewerCount:
        Math.max(
          0,
          Number(
            result.peakViewerCount || 0,
          ),
        ),
    };
  }

  // ===========================================================================
  // ADD PRODUCT
  // ===========================================================================

  async addProduct(
    userId: string,
    streamId: string,
    product: LiveProductDto,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    this.assertObjectId(streamId);

    if (!product?.productId?.trim()) {
      throw new BadRequestException(
        "Product ID is required.",
      );
    }

    if (!product?.name?.trim()) {
      throw new BadRequestException(
        "Product name is required.",
      );
    }

    const stream =
      await this.liveModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    this.assertHost(
      stream,
      userId,
    );

    if (stream.status !== "live") {
      throw new BadRequestException(
        "Products can only be modified while LIVE.",
      );
    }

    const exists =
      stream.products.some(
        (item) =>
          String(item.productId) ===
          String(product.productId),
      );

    if (exists) {
      return this.serialize(stream);
    }

    const liveProduct: LiveProduct = {
      productId:
        product.productId.trim(),

      name:
        product.name.trim(),

      imageUrl:
        product.imageUrl?.trim() || "",

      price:
        Number(product.price),

      ...(product.salePrice !==
      undefined
        ? {
            salePrice:
              Number(
                product.salePrice,
              ),
          }
        : {}),
    };

    stream.products.push(
      liveProduct,
    );

    await stream.save();

    return this.serialize(stream);
  }

  // ===========================================================================
  // REMOVE PRODUCT
  // ===========================================================================

  async removeProduct(
    userId: string,
    streamId: string,
    productId: string,
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentication required.",
      );
    }

    this.assertObjectId(streamId);

    const normalizedProductId =
      productId?.trim();

    if (!normalizedProductId) {
      throw new BadRequestException(
        "Product ID is required.",
      );
    }

    const stream =
      await this.liveModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    this.assertHost(
      stream,
      userId,
    );

    if (stream.status !== "live") {
      throw new BadRequestException(
        "Products can only be modified while LIVE.",
      );
    }

    stream.products =
      stream.products.filter(
        (product) =>
          String(product.productId) !==
          String(normalizedProductId),
      );

    await stream.save();

    return this.serialize(stream);
  }

  // ===========================================================================
  // HOST INFO — SINGLE
  // ===========================================================================

  private async getHostInfo(
    hostId: string,
  ): Promise<HostInfo | undefined> {
    if (
      !hostId ||
      !isValidObjectId(hostId)
    ) {
      return undefined;
    }

    const user =
      await this.userModel
        .findById(hostId)
        .select(
          "username firstName lastName profilePicture",
        )
        .lean();

    if (!user) {
      return undefined;
    }

    return this.mapHostInfo(user);
  }

  // ===========================================================================
  // HOST INFO — BATCH
  // ===========================================================================

  private async getHostInfoMap(
    hostIds: string[],
  ): Promise<Map<string, HostInfo>> {
    const uniqueIds =
      Array.from(
        new Set(
          hostIds.filter(
            (id) =>
              id &&
              isValidObjectId(id),
          ),
        ),
      );

    const map =
      new Map<string, HostInfo>();

    if (uniqueIds.length === 0) {
      return map;
    }

    const users =
      await this.userModel
        .find({
          _id: {
            $in: uniqueIds,
          },
        })
        .select(
          "username firstName lastName profilePicture",
        )
        .lean();

    for (const user of users) {
      map.set(
        String(user._id),
        this.mapHostInfo(user),
      );
    }

    return map;
  }

  // ===========================================================================
  // HOST INFO — MAPPER
  // ===========================================================================

  private mapHostInfo(
    user: any,
  ): HostInfo {
    const displayName =
      [
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
      username:
        user.username || "",

      displayName:
        displayName ||
        user.username ||
        "",

      avatarUrl:
        user.profilePicture || "",
    };
  }

  // ===========================================================================
  // SERIALIZE
  // ===========================================================================

  private serialize(
    stream: any,
    hostInfo?: HostInfo,
  ) {
    const viewerCount =
      Number(
        stream.viewerCount || 0,
      );

    const likeCount =
      Number(
        stream.likeCount || 0,
      );

    return {
      _id: String(stream._id),

      id: String(stream._id),

      hostId: String(stream.hostId),

      // ----------------------------------------------------------------------
      // HOST IDENTITY
      // ----------------------------------------------------------------------

      username:
        hostInfo?.username || "",

      displayName:
        hostInfo?.displayName || "",

      avatarUrl:
        hostInfo?.avatarUrl || "",

      roomName:
        stream.roomName || "",

      title:
        stream.title || "",

      description:
        stream.description || "",

      category:
        stream.category || "General",

      thumbnailUrl:
        stream.thumbnailUrl || "",

      // Compatibility alias — some frontend surfaces read `thumbnail`.
      thumbnail:
        stream.thumbnailUrl || "",

      status:
        stream.status,

      products:
        stream.products || [],

      viewerCount,

      peakViewerCount:
        Number(
          stream.peakViewerCount || 0,
        ),

      likeCount,

      commentCount:
        Number(
          stream.commentCount || 0,
        ),

      shareCount:
        Number(
          stream.shareCount || 0,
        ),

      // Compatibility aliases — the public feed rail reads these names.
      viewers: viewerCount,

      likes: likeCount,

      startedAt:
        stream.startedAt || null,

      endedAt:
        stream.endedAt || null,

      createdAt:
        stream.createdAt,

      updatedAt:
        stream.updatedAt,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private assertObjectId(
    value: string,
  ): void {
    if (
      !value ||
      !/^[a-fA-F0-9]{24}$/.test(value)
    ) {
      throw new BadRequestException(
        "Invalid LIVE stream ID.",
      );
    }
  }

  private assertHost(
    stream: LiveStreamDocument,
    userId: string,
  ): void {
    if (
      String(stream.hostId) !==
      String(userId)
    ) {
      throw new ForbiddenException(
        "You cannot modify this LIVE stream.",
      );
    }
  }
}