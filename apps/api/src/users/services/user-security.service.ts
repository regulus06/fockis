import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { isValidObjectId, Model } from "mongoose";

import * as bcrypt from "bcryptjs";

import {
  User,
  UserDocument,
} from "../user.schema";

@Injectable()
export class UserSecurityService {
  private readonly DEFAULT_MAX_FAILED_ATTEMPTS = 5;

  private readonly DEFAULT_RETRY_DELAY_SECONDS = 30;

  private readonly DEFAULT_LOCKOUT_MINUTES = 15;

  private readonly DEFAULT_FAILED_RESET_MINUTES = 30;

  private readonly DEFAULT_BCRYPT_ROUNDS = 12;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private getNumber(
    value: unknown,
    fallback: number,
  ): number {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  private getDate(
    value: unknown,
  ): Date | null {
    if (!value) {
      return null;
    }

    const date =
      value instanceof Date
        ? value
        : new Date(String(value));

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  private minutesToMilliseconds(
    minutes: number,
  ): number {
    return Math.max(0, minutes) * 60 * 1000;
  }

  private secondsToMilliseconds(
    seconds: number,
  ): number {
    return Math.max(0, seconds) * 1000;
  }

  async checkLoginLockout(
    user: UserDocument,
  ) {
    const lockedUntil =
      this.getDate(user.lockedUntil);

    if (!lockedUntil) {
      return {
        locked: false,
        retryAfterSeconds: 0,
      };
    }

    const remaining =
      lockedUntil.getTime() -
      Date.now();

    if (remaining <= 0) {
      await this.clearLoginLockout(
        String(user._id),
      );

      return {
        locked: false,
        retryAfterSeconds: 0,
      };
    }

    return {
      locked: true,
      retryAfterSeconds: Math.ceil(
        remaining / 1000,
      ),
    };
  }

  async recordFailedLogin(
    userId: string,
    options?: {
      maxFailedAttempts?: number;
      retryDelaySeconds?: number;
      lockoutMinutes?: number;
      failedResetMinutes?: number;
    },
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const maxFailedAttempts =
      this.getNumber(
        options?.maxFailedAttempts,
        this.DEFAULT_MAX_FAILED_ATTEMPTS,
      );

    const retryDelaySeconds =
      this.getNumber(
        options?.retryDelaySeconds,
        this.DEFAULT_RETRY_DELAY_SECONDS,
      );

    const lockoutMinutes =
      this.getNumber(
        options?.lockoutMinutes,
        this.DEFAULT_LOCKOUT_MINUTES,
      );

    const failedResetMinutes =
      this.getNumber(
        options?.failedResetMinutes,
        this.DEFAULT_FAILED_RESET_MINUTES,
      );

    const now = new Date();

    const lastFailed =
      this.getDate(
        user.lastFailedLoginAt,
      );

    if (
      lastFailed &&
      now.getTime() -
        lastFailed.getTime() >
        this.minutesToMilliseconds(
          failedResetMinutes,
        )
    ) {
      user.failedLoginAttempts = 0;
    }

    user.failedLoginAttempts =
      Number(user.failedLoginAttempts || 0) +
      1;

    user.lastFailedLoginAt = now;

    let locked = false;

    if (
      user.failedLoginAttempts >=
      maxFailedAttempts
    ) {
      locked = true;

      user.lockedUntil =
        new Date(
          now.getTime() +
            this.minutesToMilliseconds(
              lockoutMinutes,
            ),
        );

      user.lockoutCount =
        Number(user.lockoutCount || 0) +
        1;
    }

    await user.save();

    return {
      success: false,
      locked,
      failedLoginAttempts:
        user.failedLoginAttempts,
      retryAfterSeconds: locked
        ? Math.ceil(
            this.minutesToMilliseconds(
              lockoutMinutes,
            ) / 1000,
          )
        : retryDelaySeconds,
    };
  }

  async clearLoginLockout(
    userId: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        },
      },
    );

    return {
      success: true,
    };
  }

  async recordSuccessfulLogin(
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    user.lastSeen = new Date();
    user.online = true;

    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockedUntil = null;

    if (ip !== undefined) {
      user.lastLoginIp = ip;
    }

    if (userAgent !== undefined) {
      user.lastLoginUserAgent =
        userAgent;
    }

    await user.save();

    return user;
  }

  async updateActivity(
    userId: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          lastActiveAt: new Date(),
          lastSeen: new Date(),
          online: true,
        },
      },
    );

    return {
      success: true,
    };
  }

  async markOffline(
    userId: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          online: false,
          lastSeen: new Date(),
        },
      },
    );

    return {
      success: true,
    };
  }

  async forcePasswordChange(
    userId: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    user.mustChangePassword = true;
    user.passwordResetByAdmin = true;

    await user.save();

    return {
      success: true,
      mustChangePassword: true,
    };
  }

  async setPasswordForSecurityReset(
    userId: string,
    newPassword: string,
    forceChange = true,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    if (
      !newPassword ||
      newPassword.trim().length < 8
    ) {
      throw new BadRequestException(
        "Password must be at least 8 characters.",
      );
    }

    const user =
      await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const sameCurrent =
      await bcrypt.compare(
        newPassword,
        user.password,
      );

    if (sameCurrent) {
      throw new BadRequestException(
        "New password must be different from the current password.",
      );
    }

    for (
      const oldHash of user.passwordHistory || []
    ) {
      if (
        await bcrypt.compare(
          newPassword,
          oldHash,
        )
      ) {
        throw new BadRequestException(
          "You cannot reuse a previous password.",
        );
      }
    }

    const rounds =
      this.DEFAULT_BCRYPT_ROUNDS;

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        rounds,
      );

    user.passwordHistory = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 50);

    user.password =
      hashedPassword;

    user.passwordChangedAt =
      new Date();

    user.passwordResetByAdmin =
      true;

    user.mustChangePassword =
      forceChange;

    await user.save();

    return {
      success: true,
      mustChangePassword:
        forceChange,
    };
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    if (
      !newPassword ||
      newPassword.trim().length < 8
    ) {
      throw new BadRequestException(
        "Password must be at least 8 characters.",
      );
    }

    const user =
      await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const validCurrent =
      await bcrypt.compare(
        currentPassword,
        user.password,
      );

    if (!validCurrent) {
      throw new BadRequestException(
        "Current password is incorrect.",
      );
    }

    const sameCurrent =
      await bcrypt.compare(
        newPassword,
        user.password,
      );

    if (sameCurrent) {
      throw new BadRequestException(
        "New password must be different from the current password.",
      );
    }

    for (
      const oldHash of user.passwordHistory || []
    ) {
      if (
        await bcrypt.compare(
          newPassword,
          oldHash,
        )
      ) {
        throw new BadRequestException(
          "You cannot reuse a previous password.",
        );
      }
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        this.DEFAULT_BCRYPT_ROUNDS,
      );

    user.passwordHistory = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 50);

    user.password =
      hashedPassword;

    user.passwordChangedAt =
      new Date();

    user.mustChangePassword =
      false;

    user.passwordResetByAdmin =
      false;

    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.lockedUntil = null;

    await user.save();

    return {
      success: true,
      message:
        "Password changed successfully.",
      mustChangePassword: false,
    };
  }
}