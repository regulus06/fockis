import {
  BadRequestException,
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
  PaidContent,
  PaidContentDocument,
} from "../schemas/paid-content.schema";

import {
  CreateContentPriceDto,
} from "../dto/create-content-price.dto";

import {
  UpdateContentPriceDto,
} from "../dto/update-content-price.dto";

@Injectable()
export class ContentPricingService {
  constructor(
    @InjectModel(PaidContent.name)
    private readonly paidContentModel: Model<PaidContentDocument>,
  ) {}

  async create(
    creatorId: string,
    dto: CreateContentPriceDto,
  ) {
    if (!Types.ObjectId.isValid(creatorId)) {
      throw new BadRequestException(
        "Invalid creator ID",
      );
    }

    if (!Types.ObjectId.isValid(dto.contentId)) {
      throw new BadRequestException(
        "Invalid content ID",
      );
    }

    if (dto.isPaid && dto.streamPrice <= 0) {
      throw new BadRequestException(
        "Paid content must have a stream price greater than zero",
      );
    }

    if (
      dto.downloadEnabled &&
      dto.downloadPrice <= 0 &&
      !dto.downloadIncludedWithStream
    ) {
      throw new BadRequestException(
        "Download price must be greater than zero",
      );
    }

    const existing =
      await this.paidContentModel.findOne({
        contentId: new Types.ObjectId(dto.contentId),
      });

    if (existing) {
      throw new BadRequestException(
        "Monetization settings already exist for this content",
      );
    }

    return this.paidContentModel.create({
      creatorId: new Types.ObjectId(creatorId),
      contentId: new Types.ObjectId(dto.contentId),
      contentType: dto.contentType,
      title: dto.title,
      description: dto.description ?? "",
      isPaid: dto.isPaid,
      streamPrice: dto.streamPrice,
      downloadPrice: dto.downloadPrice,
      currency: dto.currency,
      downloadEnabled: dto.downloadEnabled,
      downloadIncludedWithStream:
        dto.downloadIncludedWithStream,
      streamEnabled: true,
      active: true,
    });
  }

  async update(
    creatorId: string,
    monetizationId: string,
    dto: UpdateContentPriceDto,
  ) {
    const content =
      await this.paidContentModel.findOne({
        _id: monetizationId,
        creatorId: new Types.ObjectId(creatorId),
      });

    if (!content) {
      throw new NotFoundException(
        "Monetization record not found",
      );
    }

    if (
      dto.isPaid === true &&
      dto.streamPrice !== undefined &&
      dto.streamPrice <= 0
    ) {
      throw new BadRequestException(
        "Stream price must be greater than zero",
      );
    }

    if (
      dto.downloadEnabled === true &&
      dto.downloadIncludedWithStream === false &&
      dto.downloadPrice !== undefined &&
      dto.downloadPrice <= 0
    ) {
      throw new BadRequestException(
        "Download price must be greater than zero",
      );
    }

    Object.assign(content, dto);

    return content.save();
  }

  async getByContentId(
    contentId: string,
  ) {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new BadRequestException(
        "Invalid content ID",
      );
    }

    return this.paidContentModel.findOne({
      contentId: new Types.ObjectId(contentId),
      active: true,
    });
  }

  async getCreatorContent(
    creatorId: string,
  ) {
    return this.paidContentModel
      .find({
        creatorId: new Types.ObjectId(creatorId),
      })
      .sort({
        createdAt: -1,
      });
  }
}