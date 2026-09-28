import {
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
  Business,
  BusinessDocument,
  BusinessImageSource,
} from "./schemas/business.schema";

import {
  BusinessDeal,
  BusinessDealDocument,
} from "./schemas/business-deal.schema";

import {
  CreateBusinessDto,
} from "./dto/create-business.dto";

import {
  UpdateBusinessDto,
} from "./dto/update-business.dto";

import {
  CreateBusinessDealDto,
} from "./dto/create-business-deal.dto";

import {
  UpdateBusinessDealDto,
} from "./dto/update-business-deal.dto";

import {
  BusinessStatus,
} from "./enums/business-status.enum";


@Injectable()
export class BusinessesService {

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel:
      Model<BusinessDocument>,

    @InjectModel(BusinessDeal.name)
    private readonly dealModel:
      Model<BusinessDealDocument>,
  ) {}


  /* ==========================================================================
     PUBLIC BUSINESSES

     Only businesses explicitly published to the Fockis Feed are returned.
  ========================================================================== */

  async findPublic() {

    const now = new Date();

    const businesses =
      await this.businessModel
        .find({
          status:
            BusinessStatus.ACTIVE,

          feedEnabled: true,
        })
        .sort({
          spotlightPriority: -1,
          createdAt: -1,
        })
        .limit(100)
        .lean();


    if (!businesses.length) {
      return [];
    }


    const businessIds =
      businesses.map(
        (business) =>
          business._id,
      );


    const deals =
      await this.dealModel
        .find({
          businessId: {
            $in: businessIds,
          },

          active: true,

          expiresAt: {
            $gt: now,
          },
        })
        .sort({
          expiresAt: 1,
        })
        .lean();


    return businesses.map(
      (business) => ({

        ...business,

        id:
          business._id.toString(),

        deals:
          deals
            .filter(
              (deal) =>
                deal.businessId.toString() ===
                business._id.toString(),
            )
            .map(
              (deal) => ({

                ...deal,

                id:
                  deal._id.toString(),

                businessId:
                  deal.businessId.toString(),

              }),
            ),

      }),
    );
  }


  /* ==========================================================================
     CREATE BUSINESS
  ========================================================================== */

  async create(
    ownerId: string,
    dto: CreateBusinessDto,
  ) {

    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }


    const business =
      await this.businessModel.create({

        ...dto,

        ownerId:
          new Types.ObjectId(
            ownerId,
          ),

        status:
          BusinessStatus.PENDING_REVIEW,

        feedEnabled:
          false,

        coverImageSource:
          BusinessImageSource.URL,

        logoSource:
          BusinessImageSource.URL,

      });


    return {

      ...business.toObject(),

      id:
        business._id.toString(),

      deals: [],

    };
  }


  /* ==========================================================================
     MY BUSINESSES
  ========================================================================== */

  async findMine(
    ownerId: string,
  ) {

    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }


    const businesses =
      await this.businessModel
        .find({
          ownerId:
            new Types.ObjectId(
              ownerId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .lean();


    if (!businesses.length) {
      return [];
    }


    const businessIds =
      businesses.map(
        (business) =>
          business._id,
      );


    const deals =
      await this.dealModel
        .find({
          businessId: {
            $in: businessIds,
          },
        })
        .sort({
          expiresAt: 1,
        })
        .lean();


    return businesses.map(
      (business) => ({

        ...business,

        id:
          business._id.toString(),

        deals:
          deals
            .filter(
              (deal) =>
                deal.businessId.toString() ===
                business._id.toString(),
            )
            .map(
              (deal) => ({

                ...deal,

                id:
                  deal._id.toString(),

                businessId:
                  deal.businessId.toString(),

              }),
            ),

      }),
    );
  }


  /* ==========================================================================
     GET ONE BUSINESS
  ========================================================================== */

  async findOne(
    id: string,
  ) {

    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const business =
      await this.businessModel
        .findById(id)
        .lean();


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const deals =
      await this.dealModel
        .find({
          businessId:
            new Types.ObjectId(id),

          active: true,

          expiresAt: {
            $gt: new Date(),
          },
        })
        .sort({
          expiresAt: 1,
        })
        .lean();


    return {

      ...business,

      id:
        business._id.toString(),

      deals:
        deals.map(
          (deal) => ({

            ...deal,

            id:
              deal._id.toString(),

            businessId:
              deal.businessId.toString(),

          }),
        ),

    };
  }


  /* ==========================================================================
     UPDATE BUSINESS
  ========================================================================== */

  async update(
    ownerId: string,
    id: string,
    dto: UpdateBusinessDto,
  ) {

    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }


    const business =
      await this.businessModel
        .findById(id);


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }


    Object.assign(
      business,
      dto,
    );


    if (
      dto.coverImageUrl !==
      undefined
    ) {

      business.coverImageUrl =
        dto.coverImageUrl;

      business.coverImageSource =
        BusinessImageSource.URL;
    }


    if (
      dto.logoUrl !==
      undefined
    ) {

      business.logoUrl =
        dto.logoUrl;

      business.logoSource =
        BusinessImageSource.URL;
    }


    const saved =
      await business.save();


    return {

      ...saved.toObject(),

      id:
        saved._id.toString(),

    };
  }


  /* ==========================================================================
     PUBLISH / UNPUBLISH TO FOCKIS FEED
  ========================================================================== */

  async publishToFeed(
    ownerId: string,
    businessId: string,
    published: boolean,
  ) {

    if (
      !Types.ObjectId.isValid(
        businessId,
      )
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }


    const business =
      await this.businessModel
        .findById(
          businessId,
        );


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }


    if (published) {

      business.status =
        BusinessStatus.ACTIVE;

      business.feedEnabled =
        true;

    } else {

      business.feedEnabled =
        false;

    }


    const saved =
      await business.save();


    return {

      success: true,

      published:
        saved.feedEnabled,

      business: {

        ...saved.toObject(),

        id:
          saved._id.toString(),

      },

    };
  }


  /* ==========================================================================
     SET COVER IMAGE
  ========================================================================== */

  async setCoverImage(
    ownerId: string,
    businessId: string,
    image: {
      url: string;
      source: BusinessImageSource;
    },
  ) {

    if (
      !Types.ObjectId.isValid(
        businessId,
      )
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const business =
      await this.businessModel
        .findById(
          businessId,
        );


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }


    business.coverImageUrl =
      image.url;

    business.coverImageSource =
      image.source;


    const saved =
      await business.save();


    return {

      success: true,

      business: {

        id:
          saved._id.toString(),

        coverImageUrl:
          saved.coverImageUrl,

        coverImageSource:
          saved.coverImageSource,

      },

    };
  }


  /* ==========================================================================
     DELETE BUSINESS
  ========================================================================== */

  async remove(
    ownerId: string,
    id: string,
  ) {

    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const business =
      await this.businessModel
        .findById(id);


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }


    await this.dealModel.deleteMany({
      businessId:
        business._id,
    });


    await business.deleteOne();


    return {
      success: true,
    };
  }


  /* ==========================================================================
     BUSINESS SPOTLIGHT
  ========================================================================== */

  async getSpotlight() {

    const now = new Date();


    const businesses =
      await this.businessModel
        .find({

          status:
            BusinessStatus.ACTIVE,

          feedEnabled:
            true,

          spotlightEnabled:
            true,

        })
        .sort({

          spotlightPriority: -1,

          createdAt: -1,

        })
        .limit(20)
        .lean();


    if (!businesses.length) {
      return [];
    }


    const businessIds =
      businesses.map(
        (business) =>
          business._id,
      );


    const deals =
      await this.dealModel
        .find({

          businessId: {
            $in: businessIds,
          },

          active: true,

          expiresAt: {
            $gt: now,
          },

        })
        .sort({
          expiresAt: 1,
        })
        .lean();


    return businesses.map(
      (business) => ({

        ...business,

        id:
          business._id.toString(),

        deals:
          deals
            .filter(
              (deal) =>
                deal.businessId.toString() ===
                business._id.toString(),
            )
            .map(
              (deal) => ({

                ...deal,

                id:
                  deal._id.toString(),

                businessId:
                  deal.businessId.toString(),

              }),
            ),

      }),
    );
  }


  /* ==========================================================================
     CREATE DEAL
  ========================================================================== */

  async createDeal(
    ownerId: string,
    businessId: string,
    dto: CreateBusinessDealDto,
  ) {

    if (
      !Types.ObjectId.isValid(
        businessId,
      )
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const business =
      await this.businessModel
        .findById(
          businessId,
        );


    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }


    const deal =
      await this.dealModel.create({

        ...dto,

        businessId:
          new Types.ObjectId(
            businessId,
          ),

        expiresAt:
          new Date(
            dto.expiresAt,
          ),

      });


    return {

      ...deal.toObject(),

      id:
        deal._id.toString(),

      businessId:
        deal.businessId.toString(),

    };
  }


  /* ==========================================================================
     UPDATE DEAL
  ========================================================================== */

  async updateDeal(
    ownerId: string,
    dealId: string,
    dto: UpdateBusinessDealDto,
  ) {

    if (
      !Types.ObjectId.isValid(
        dealId,
      )
    ) {
      throw new NotFoundException(
        "Deal not found",
      );
    }


    const deal =
      await this.dealModel
        .findById(
          dealId,
        );


    if (!deal) {
      throw new NotFoundException(
        "Deal not found",
      );
    }


    const business =
      await this.businessModel
        .findById(
          deal.businessId,
        );


    if (
      !business ||
      business.ownerId.toString() !==
        ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this deal",
      );
    }


    Object.assign(
      deal,
      dto,
    );


    if (
      dto.expiresAt
    ) {

      deal.expiresAt =
        new Date(
          dto.expiresAt,
        );
    }


    const saved =
      await deal.save();


    return {

      ...saved.toObject(),

      id:
        saved._id.toString(),

      businessId:
        saved.businessId.toString(),

    };
  }


  /* ==========================================================================
     DELETE DEAL
  ========================================================================== */

  async deleteDeal(
    ownerId: string,
    dealId: string,
  ) {

    if (
      !Types.ObjectId.isValid(
        dealId,
      )
    ) {
      throw new NotFoundException(
        "Deal not found",
      );
    }


    const deal =
      await this.dealModel
        .findById(
          dealId,
        );


    if (!deal) {
      throw new NotFoundException(
        "Deal not found",
      );
    }


    const business =
      await this.businessModel
        .findById(
          deal.businessId,
        );


    if (
      !business ||
      business.ownerId.toString() !==
        ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this deal",
      );
    }


    await deal.deleteOne();


    return {
      success: true,
    };
  }


  /* ==========================================================================
     TRACK WEBSITE CLICK
  ========================================================================== */

  async trackWebsiteClick(
    id: string,
  ) {

    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const result =
      await this.businessModel
        .updateOne(
          {
            _id: id,
          },
          {
            $inc: {
              websiteClicks: 1,
            },
          },
        );


    if (
      result.matchedCount === 0
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    return {
      success: true,
    };
  }


  /* ==========================================================================
     TRACK VIEW
  ========================================================================== */

  async trackView(
    id: string,
  ) {

    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    const result =
      await this.businessModel
        .updateOne(
          {
            _id: id,
          },
          {
            $inc: {
              views: 1,
            },
          },
        );


    if (
      result.matchedCount === 0
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }


    return {
      success: true,
    };
  }
}