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
  Store,
  StoreDocument,
} from "./schemas/store.schema";


@Injectable()
export class StoresDashboardService {


  constructor(

    @InjectModel(Store.name)
    private readonly storeModel:
      Model<StoreDocument>,

  ) {}


  // =====================================================
  // DASHBOARD
  // GET STORE DASHBOARD
  // =====================================================

  async getDashboard(
    userId: string
  ) {

    if (
      !Types.ObjectId.isValid(userId)
    ) {

      throw new BadRequestException(
        "Invalid user id"
      );

    }


    const store =
      await this.storeModel.findOne({

        ownerId:
          new Types.ObjectId(
            userId
          ),

      });


    if (!store) {

      throw new NotFoundException(
        "Store not found"
      );

    }


    return {

      store,

      statistics: {

        followers:
          store.followers || 0,

        rating:
          store.rating || 0,

        reviews:
          store.reviewCount || 0,

      },

    };

  }


  // =====================================================
  // STORE INFORMATION
  // =====================================================

  async getStore(
    userId: string
  ) {

    if (
      !Types.ObjectId.isValid(userId)
    ) {

      throw new BadRequestException(
        "Invalid user id"
      );

    }


    const store =
      await this.storeModel.findOne({

        ownerId:
          new Types.ObjectId(
            userId
          ),

      });


    if (!store) {

      throw new NotFoundException(
        "Store not found"
      );

    }


    return store;

  }


  // =====================================================
  // ANALYTICS
  // =====================================================

  async getAnalytics(
    userId: string
  ) {

    if (
      !Types.ObjectId.isValid(userId)
    ) {

      throw new BadRequestException(
        "Invalid user id"
      );

    }


    const store =
      await this.storeModel.findOne({

        ownerId:
          new Types.ObjectId(
            userId
          ),

      });


    if (!store) {

      throw new NotFoundException(
        "Store not found"
      );

    }


    return {

      followers:
        store.followers || 0,

      rating:
        store.rating || 0,

      reviews:
        store.reviewCount || 0,

    };

  }

}