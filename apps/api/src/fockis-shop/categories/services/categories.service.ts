import {
  Injectable,
  OnModuleInit,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  Category,
  CategoryDocument,
} from "../categories.schema";

import {
  DEFAULT_MARKETPLACE_CATEGORIES,
} from "../seed-categories";


@Injectable()
export class CategoriesService
  implements OnModuleInit
{

  constructor(

    @InjectModel(Category.name)

    private readonly categoryModel:
      Model<CategoryDocument>,

  ) {}


  /**
   * ============================================================
   * INITIALIZE
   * ============================================================
   */

  async onModuleInit() {

    await this.seedDefaultCategories();

  }


  /**
   * ============================================================
   * SEED DEFAULT CATEGORIES
   * ============================================================
   *
   * Only creates categories that don't already exist.
   *
   * Existing categories are preserved.
   * ============================================================
   */

  private async seedDefaultCategories() {

    for (
      const category
      of DEFAULT_MARKETPLACE_CATEGORIES
    ) {

      await this.categoryModel.updateOne(

        {
          name: category.name,
        },

        {
          $setOnInsert: category,
        },

        {
          upsert: true,
        },

      );

    }


    console.log(
      `FOCKIS: ${DEFAULT_MARKETPLACE_CATEGORIES.length} marketplace categories initialized.`,
    );

  }


  /**
   * ============================================================
   * GET ACTIVE CATEGORIES
   * ============================================================
   */

  async findAll() {

    return this.categoryModel

      .find({
        status: "active",
      })

      .sort({
        name: 1,
      })

      .lean()

      .exec();

  }


  /**
   * ============================================================
   * GET CATEGORY BY ID
   * ============================================================
   */

  async findById(
    id: string,
  ) {

    return this.categoryModel

      .findOne({
        _id: id,
        status: "active",
      })

      .lean()

      .exec();

  }


  /**
   * ============================================================
   * ADMIN CREATE
   * ============================================================
   */

  async create(
    data: Partial<Category>,
  ) {

    const category =
      new this.categoryModel(data);

    return category.save();

  }


  /**
   * ============================================================
   * ADMIN UPDATE
   * ============================================================
   */

  async update(

    id: string,

    data: Partial<Category>,

  ) {

    return this.categoryModel.findByIdAndUpdate(

      id,

      data,

      {
        new: true,
        runValidators: true,
      },

    );

  }


  /**
   * ============================================================
   * ADMIN DELETE
   * ============================================================
   */

  async remove(
    id: string,
  ) {

    return this.categoryModel.findByIdAndDelete(
      id,
    );

  }

}