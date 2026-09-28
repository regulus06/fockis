import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Gift,
  GiftDocument,
} from "./schemas/gift.schema";

import {
  GiftTransaction,
  GiftTransactionDocument,
} from "./schemas/gift-transaction.schema";

import {
  CreatorEarning,
  CreatorEarningDocument,
} from "./schemas/creator-earning.schema";

import {
  CreateGiftDto,
} from "./dto/create-gift.dto";

import {
  SendGiftDto,
} from "./dto/send-gift.dto";

import {
  GiftsGateway,
} from "./gateway/gifts.gateway";

import {
  WalletService,
} from "../wallet/wallet.service";

import {
  PostsService,
} from "../posts/posts.service";

@Injectable()
export class GiftsService {
  constructor(
    @InjectModel(Gift.name)
    private readonly giftModel:
      Model<GiftDocument>,

    @InjectModel(GiftTransaction.name)
    private readonly transactionModel:
      Model<GiftTransactionDocument>,

    @InjectModel(CreatorEarning.name)
    private readonly earningModel:
      Model<CreatorEarningDocument>,

    private readonly walletService:
      WalletService,

    private readonly giftsGateway:
      GiftsGateway,

    /*
     * Used to persist giftsCount directly on the
     * Post document so it survives refresh and is
     * returned to every viewer, not just the sender.
     */
    private readonly postsService:
      PostsService,
  ) {}

  // ============================================================
  // GET ALL ACTIVE GIFTS
  // ============================================================

  async getGifts() {
    return this.giftModel
      .find({
        isActive: true,
      })
      .sort({
        coinPrice: 1,
      })
      .lean()
      .exec();
  }

  // ============================================================
  // GET SINGLE GIFT
  // ============================================================

  async getGift(
    id: string,
  ) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        "Invalid gift ID",
      );
    }

    const gift =
      await this.giftModel.findOne({
        _id: id,
        isActive: true,
      });

    if (!gift) {
      throw new NotFoundException(
        "Gift not found",
      );
    }

    return gift;
  }

  // ============================================================
  // CREATE GIFT
  // ============================================================

  async createGift(
    dto: CreateGiftDto,
  ) {
    return this.giftModel.create(
      dto,
    );
  }

  // ============================================================
  // GET POST GIFT SENDERS
  //
  // Returns every gift transaction for a given post, newest
  // first, with the sender's username/profilePicture populated.
  //
  // Used to power the "who sent this" popover when a viewer
  // taps the gift count on a post's action bar.
  // ============================================================

  async getPostGiftSenders(
    postId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        postId,
      )
    ) {
      throw new BadRequestException(
        `Invalid post ID: ${postId}`,
      );
    }

    const transactions =
      await this.transactionModel
        .find({
          postId:
            new Types.ObjectId(
              postId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .populate(
          "senderId",
          "username profilePicture",
        )
        .lean();

    return transactions.map(
      (transaction: any) => {
        const sender =
          transaction.senderId &&
          typeof transaction.senderId ===
            "object"
            ? transaction.senderId
            : null;

        return {
          senderId: sender
            ? String(
                sender._id,
              )
            : String(
                transaction.senderId,
              ),

          username:
            sender?.username ||
            "Unknown",

          profilePicture:
            sender?.profilePicture ||
            "",

          giftId: String(
            transaction.giftId,
          ),

          giftName:
            transaction.giftName,

          emoji:
            transaction.emoji,

          coinsSpent:
            transaction.coinsSpent,

          createdAt:
            transaction.createdAt,
        };
      },
    );
  }

  // ============================================================
  // SEND GIFT
  //
  // Supports:
  //
  // 1. Feed post gift
  //
  //    senderId
  //    receiverId
  //    giftId
  //    postId
  //
  // 2. LIVE gift
  //
  //    senderId
  //    receiverId
  //    giftId
  //    liveId
  //
  // ============================================================

  async sendGift(
    dto: SendGiftDto,
  ) {
    console.log(
      "[GiftsService] sendGift received:",
      dto,
    );

    // ==========================================================
    // VALIDATE SENDER
    // ==========================================================

    if (
      !dto.senderId ||
      !Types.ObjectId.isValid(
        dto.senderId,
      )
    ) {
      throw new BadRequestException(
        `Invalid sender ID: ${dto.senderId}`,
      );
    }

    // ==========================================================
    // VALIDATE RECEIVER
    // ==========================================================

    if (
      !dto.receiverId ||
      !Types.ObjectId.isValid(
        dto.receiverId,
      )
    ) {
      throw new BadRequestException(
        `Invalid receiver ID: ${dto.receiverId}`,
      );
    }

    // ==========================================================
    // PREVENT SELF GIFT
    // ==========================================================

    if (
      dto.senderId ===
      dto.receiverId
    ) {
      throw new BadRequestException(
        "You cannot send a gift to yourself",
      );
    }

    // ==========================================================
    // VALIDATE GIFT ID
    // ==========================================================

    if (
      !dto.giftId ||
      !Types.ObjectId.isValid(
        dto.giftId,
      )
    ) {
      throw new BadRequestException(
        `Invalid gift ID: ${dto.giftId}`,
      );
    }

    // ==========================================================
    // VALIDATE POST ID
    //
    // This is optional because LIVE gifts don't
    // have a feed post.
    // ==========================================================

    if (
      dto.postId &&
      !Types.ObjectId.isValid(
        dto.postId,
      )
    ) {
      throw new BadRequestException(
        `Invalid post ID: ${dto.postId}`,
      );
    }

    // ==========================================================
    // VALIDATE LIVE ID
    // ==========================================================

    if (
      dto.liveId &&
      dto.liveId.trim() === ""
    ) {
      throw new BadRequestException(
        "Invalid live ID",
      );
    }

    // ==========================================================
    // FIND ACTIVE GIFT
    // ==========================================================

    const gift =
      await this.giftModel.findOne({
        _id:
          new Types.ObjectId(
            dto.giftId,
          ),
        isActive: true,
      });

    if (!gift) {
      throw new NotFoundException(
        "Gift not found or inactive",
      );
    }

    console.log(
      "[GiftsService] Gift:",
      {
        id:
          gift._id.toString(),

        name:
          gift.name,

        price:
          gift.coinPrice,
      },
    );

    // ==========================================================
    // SPEND SENDER COINS
    // ==========================================================

    const spendResult =
      await this.walletService.spendCoins(
        dto.senderId,
        gift.coinPrice,
        `Sent gift: ${gift.name}`,
        gift._id.toString(),
      );

    console.log(
      "[GiftsService] Coins spent:",
      spendResult,
    );

    // ==========================================================
    // CREATE GIFT TRANSACTION
    // ==========================================================

    const transaction =
      await this.transactionModel.create({
        senderId:
          new Types.ObjectId(
            dto.senderId,
          ),

        receiverId:
          new Types.ObjectId(
            dto.receiverId,
          ),

        giftId:
          gift._id,

        /**
         * Important:
         *
         * This stores the exact Fockis post
         * that received the gift.
         */
        postId:
          dto.postId
            ? new Types.ObjectId(
                dto.postId,
              )
            : null,

        coinsSpent:
          gift.coinPrice,

        /*
         * Stored denormalized so gift name/emoji still
         * display correctly even if the Gift catalog
         * entry changes or is later removed.
         */
        giftName:
          gift.name,

        emoji:
          gift.emoji,

        sound:
          gift.sound,

        duration:
          gift.duration,

        fullScreenAnimation:
          gift.fullScreenAnimation,

        liveId:
          dto.liveId ||
          null,

        animation:
          gift.animation,
      });

    console.log(
      "[GiftsService] Gift transaction created:",
      {
        transactionId:
          transaction._id.toString(),

        postId:
          dto.postId ||
          null,

        liveId:
          dto.liveId ||
          null,
      },
    );

    // ==========================================================
    // CREDIT RECEIVER
    // ==========================================================

    const receiveResult =
      await this.walletService.receiveGiftCoins(
        dto.receiverId,
        gift.coinPrice,
        `Gift received: ${gift.name}`,
        transaction._id.toString(),
      );

    console.log(
      "[GiftsService] Receiver credited:",
      receiveResult,
    );

    // ==========================================================
    // CREATOR EARNINGS
    // ==========================================================

    let earning =
      await this.earningModel.findOne({
        creatorId:
          new Types.ObjectId(
            dto.receiverId,
          ),
      });

    if (!earning) {
      earning =
        await this.earningModel.create({
          creatorId:
            new Types.ObjectId(
              dto.receiverId,
            ),

          coinsReceived:
            0,

          estimatedValue:
            0,

          availableBalance:
            0,

          withdrawnAmount:
            0,
        });
    }

    // ==========================================================
    // UPDATE CREATOR EARNINGS
    // ==========================================================

    earning.coinsReceived +=
      gift.coinPrice;

    /*
     * Example:
     *
     * 100 coins = $1
     */
    earning.estimatedValue =
      earning.coinsReceived /
      100;

    earning.availableBalance =
      earning.estimatedValue;

    await earning.save();

    // ==========================================================
    // PERSIST GIFTS COUNT ON THE POST
    //
    // IMPORTANT:
    //
    // This is what makes the gift count survive a refresh
    // and appear for EVERY viewer of the post (sender,
    // receiver, and anyone else), not just the sender's
    // local optimistic state.
    // ==========================================================

    let updatedPostGiftsCount:
      number | null = null;

    if (dto.postId) {
      const updatedPost =
        await this.postsService.incrementGiftsCount(
          dto.postId,
        );

      updatedPostGiftsCount =
        updatedPost.giftsCount;

      console.log(
        "[GiftsService] Post giftsCount updated:",
        {
          postId:
            dto.postId,

          giftsCount:
            updatedPostGiftsCount,
        },
      );
    }

    // ==========================================================
    // LIVE GIFT SOCKET EVENT
    //
    // Only broadcast when this is actually
    // a LIVE gift.
    // ==========================================================

    if (dto.liveId) {
      this.giftsGateway.sendGiftAnimation(
        dto.liveId,
        {
          giftId:
            gift._id.toString(),

          giftName:
            gift.name,

          emoji:
            gift.emoji,

          animation:
            gift.animation,

          sound:
            gift.sound,

          duration:
            gift.duration,

          fullScreenAnimation:
            gift.fullScreenAnimation,

          senderId:
            dto.senderId,

          receiverId:
            dto.receiverId,

          liveId:
            dto.liveId,
        },
      );
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return {
      success:
        true,

      message:
        dto.postId
          ? "Gift sent to post successfully"
          : dto.liveId
            ? "Gift sent to LIVE successfully"
            : "Gift sent successfully",

      gift,

      transaction,

      postId:
        dto.postId ||
        null,

      /*
       * The post's new, persisted total gift count.
       * The frontend can use this to sync its local
       * state exactly instead of just incrementing
       * blindly by 1.
       */
      postGiftsCount:
        updatedPostGiftsCount,

      liveId:
        dto.liveId ||
        null,

      spentCoins:
        gift.coinPrice,

      remainingCoins:
        spendResult.coins,

      receiverCoins:
        receiveResult.coins,
    };
  }
}