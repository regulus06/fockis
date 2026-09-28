import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  User,
  UserDocument,
} from "../../users/user.schema";

import {
  Follow,
} from "../../follows/schemas/follow.schema";

import {
  Message,
  MessageDocument,
} from "../../messages/schemas/message.schema";

import {
  SellerProfile,
  SellerProfileDocument,
} from "../seller-profile.schema";


@Injectable()
export class SellerService {

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Follow.name)
    private followModel: Model<Follow>,

    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,

    @InjectModel(SellerProfile.name)
    private sellerProfileModel: Model<SellerProfileDocument>,
  ) {}


  // =====================================================
  // BECOME SELLER — activates a SellerProfile for a user
  // =====================================================
  async becomeSeller(userId: string) {

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    const existing = await this.sellerProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existing) {
      throw new ConflictException("Seller profile already exists");
    }

    const profile = await this.sellerProfileModel.create({
      userId: new Types.ObjectId(userId),
      status: "active",   // flip to "pending" here if you want admin approval first
      active: true,
    });

    await this.userModel.findByIdAndUpdate(userId, {
      accountType: "seller",
      sellerApproved: true,
    });

    return profile;
  }


  // =====================================================
  // GET ACTIVE SELLER PROFILE — used by StoresService to
  // verify a user is allowed to create a store
  // =====================================================
  async getActiveProfile(userId: string) {

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    const profile = await this.sellerProfileModel.findOne({
      userId: new Types.ObjectId(userId),
      active: true,
    });

    if (!profile) {
      throw new NotFoundException("No active seller profile — become a seller first");
    }

    return profile;
  }


  async getProfile(userId: string) {

    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException("Invalid user id");
    }

    const user = await this.userModel
      .findById(userId)
      .select("username email profilePicture accountType sellerApproved")
      .lean();

    if (!user) {
      throw new NotFoundException("Seller not found");
    }

    const followerCount = await this.followModel.countDocuments({
      following: userId,
    });

    const responseTime = await this.calculateResponseTime(userId);

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      accountType: user.accountType,
      sellerApproved: user.sellerApproved,
      followerCount,
      responseTime,
    };
  }


  private async calculateResponseTime(sellerId: string) {

    const messages = await this.messageModel
      .find({ senderId: { $ne: sellerId } })
      .sort({ createdAt: 1 })
      .limit(1000)
      .lean();

    if (messages.length === 0) {
      return "No response data yet";
    }

    return "Usually replies within 1 hour";
  }

}