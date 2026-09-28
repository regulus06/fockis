import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  PaidContent,
  PaidContentDocument,
} from "../schemas/paid-content.schema";

import {
  ContentEntitlement,
  ContentEntitlementDocument,
} from "../schemas/content-entitlement.schema";

import {
  ContentAccessResult,
  ContentPriceCurrency,
  EntitlementStatus,
  EntitlementType,
} from "../types/content-monetization.types";

@Injectable()
export class ContentAccessService {
  constructor(
    @InjectModel(PaidContent.name)
    private readonly paidContentModel: Model<PaidContentDocument>,

    @InjectModel(ContentEntitlement.name)
    private readonly entitlementModel: Model<ContentEntitlementDocument>,
  ) {}

  async getAccess(
    userId: string,
    contentId: string,
  ): Promise<ContentAccessResult> {
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
      return {
        contentId,
        contentType: undefined as any,
        canStream: true,
        canDownload: false,
        downloadEnabled: false,
      };
    }

    if (!content.isPaid) {
      return {
        contentId,
        contentType: content.contentType,
        canStream: true,
        canDownload: content.downloadEnabled,
        streamPrice: 0,
        downloadPrice: content.downloadPrice,
        currency: content.currency,
        downloadEnabled: content.downloadEnabled,
      };
    }

    const streamEntitlement =
      await this.entitlementModel.findOne({
        userId: new Types.ObjectId(userId),
        contentId: new Types.ObjectId(contentId),
        entitlementType: EntitlementType.STREAM,
        status: EntitlementStatus.ACTIVE,
      });

    const downloadEntitlement =
      await this.entitlementModel.findOne({
        userId: new Types.ObjectId(userId),
        contentId: new Types.ObjectId(contentId),
        entitlementType: EntitlementType.DOWNLOAD,
        status: EntitlementStatus.ACTIVE,
      });

    return {
      contentId,
      contentType: content.contentType,
      canStream: !!streamEntitlement,
      canDownload:
        !!downloadEntitlement ||
        (!!streamEntitlement &&
          content.downloadIncludedWithStream),
      streamPrice: content.streamPrice,
      downloadPrice: content.downloadPrice,
      currency: content.currency,
      downloadEnabled: content.downloadEnabled,
    };
  }

  async hasStreamAccess(
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    const access =
      await this.getAccess(userId, contentId);

    return access.canStream;
  }

  async hasDownloadAccess(
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    const access =
      await this.getAccess(userId, contentId);

    return access.canDownload;
  }
}