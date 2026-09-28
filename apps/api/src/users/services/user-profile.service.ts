import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  isValidObjectId,
  Model,
} from "mongoose";

import {
  User,
  UserDocument,
} from "../user.schema";

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(
    userId: string,
  ): Promise<UserDocument | null> {
    if (!isValidObjectId(userId)) {
      return null;
    }

    return this.userModel.findById(
      userId,
    );
  }

  async getUserById(
    id: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    return user;
  }

  async updateUser(
    id: string,
    dto: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const update = {
      ...dto,
    };

    delete update.fockisId;
    delete update.countryCode;
    delete update.callingCode;

    delete update.fockisIdAccessPaid;
    delete update.fockisIdAccessPaidAt;
    delete update.fockisIdAccessPaymentId;

    const user =
      await this.userModel.findByIdAndUpdate(
        id,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    return user;
  }

  async deleteUser(
    id: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const result =
      await this.userModel.deleteOne({
        _id: id,
      });

    if (!result.deletedCount) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    return {
      success: true,
    };
  }
}