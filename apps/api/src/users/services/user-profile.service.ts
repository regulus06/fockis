import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { User, UserDocument } from "../user.schema";

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Internal database lookup.
   * Never expose the returned document directly through public APIs.
   */
  async findById(userId: string): Promise<UserDocument | null> {
    if (!isValidObjectId(userId)) {
      return null;
    }

    return this.userModel.findById(userId);
  }

  /**
   * Return only fields approved for a public profile.
   * Private account and authentication information is excluded.
   */
  async getUserById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException("Invalid user ID.");
    }

    const user = await this.userModel
      .findById(id)
      .select(
        [
          "username",
          "firstName",
          "lastName",
          "profilePicture",
          "coverPhoto",
          "bio",
          "location",
          "website",
          "isPrivate",
          "postsCount",
          "likesReceived",
        ].join(" "),
      )
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return {
      id: String(user._id),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isPrivate: user.isPrivate,
      postsCount: user.postsCount ?? 0,
      likesReceived: user.likesReceived ?? 0,
    };
  }

  /**
   * Only explicitly approved profile fields may be updated.
   * Email, password, phone, birth date, roles, seller approval,
   * subscriptions, and security settings cannot be changed here.
   */
  async updateUser(id: string, dto: Record<string, unknown>) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException("Invalid user ID.");
    }

    const allowedFields = [
      "username",
      "firstName",
      "lastName",
      "bio",
      "location",
      "website",
      "profilePicture",
      "coverPhoto",
      "isPrivate",
    ] as const;

    const update: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(dto, field)) {
        update[field] = dto[field];
      }
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException(
        "No permitted profile fields were provided.",
      );
    }

    if (Object.prototype.hasOwnProperty.call(update, "username")) {
      if (typeof update.username !== "string") {
        throw new BadRequestException("Username must be text.");
      }

      const username = update.username.trim().toLowerCase();

      // Deliberately allow only letters, digits, and underscores.
      // This also makes the case-insensitive duplicate check safe.
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        throw new BadRequestException(
          "Username must be 3–30 characters and contain only letters, numbers, and underscores.",
        );
      }

      const existingUser = await this.userModel
        .findOne({
          username: { $regex: `^${username}$`, $options: "i" },
          _id: { $ne: id },
        })
        .select("_id")
        .lean()
        .exec();

      if (existingUser) {
        throw new ConflictException(
          "That username is already taken. Please choose another.",
        );
      }

      update.username = username;
    }

    try {
      const user = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: update },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!user) {
        throw new NotFoundException("User not found.");
      }

      // Return only the safe public profile.
      return this.getUserById(id);
    } catch (error: unknown) {
      // Handle a duplicate-key error if concurrent requests race.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          "That username is already taken. Please choose another.",
        );
      }

      throw error;
    }
  }

  async deleteUser(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException("Invalid user ID.");
    }

    const result = await this.userModel.deleteOne({ _id: id });

    if (!result.deletedCount) {
      throw new NotFoundException("User not found.");
    }

    return { success: true };
  }
}
