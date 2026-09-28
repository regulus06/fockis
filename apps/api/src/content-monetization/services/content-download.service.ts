import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  ContentDownload,
  ContentDownloadDocument,
} from "../schemas/content-download.schema";

import {
  PaidContent,
  PaidContentDocument,
} from "../schemas/paid-content.schema";

import {
  ContentAccessService,
} from "./content-access.service";

@Injectable()
export class ContentDownloadService {
  constructor(
    @InjectModel(ContentDownload.name)
    private readonly downloadModel:
      Model<ContentDownloadDocument>,

    @InjectModel(PaidContent.name)
    private readonly paidContentModel:
      Model<PaidContentDocument>,

    private readonly contentAccessService:
      ContentAccessService,
  ) {}

  async createDownloadAccess(
    userId: string,
    contentId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(contentId)
    ) {
      throw new BadRequestException(
        "Invalid user or content ID",
      );
    }

    const content =
      await this.paidContentModel.findOne({
        contentId: new Types.ObjectId(contentId),
        active: true,
      });

    if (!content) {
      throw new NotFoundException(
        "Content not found",
      );
    }

    if (!content.downloadEnabled) {
      throw new ForbiddenException(
        "Downloads are disabled for this content",
      );
    }

    const hasAccess =
      await this.contentAccessService.hasDownloadAccess(
        userId,
        contentId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        "Download purchase required",
      );
    }

    const entitlement =
      await this.contentAccessService.getAccess(
        userId,
        contentId,
      );

    const download =
      await this.downloadModel.create({
        userId: new Types.ObjectId(userId),
        contentId: new Types.ObjectId(contentId),
        purchaseId: undefined,
        contentType: content.contentType,
        ipAddress,
        userAgent,
        successful: true,
        downloadedAt: new Date(),
      });

    await this.paidContentModel.updateOne(
      {
        contentId: new Types.ObjectId(
          contentId,
        ),
      },
      {
        $inc: {
          totalDownloads: 1,
        },
      },
    );

    return {
      allowed: true,
      contentId,
      contentType: content.contentType,
      canDownload:
        entitlement.canDownload,
      download,
    };
  }
}