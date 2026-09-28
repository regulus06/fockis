import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  User,
  UserDocument,
} from "./user.schema";

import {
  FockisIdSettings,
  FockisIdSettingsDocument,
} from "../message-admin/schemas/fockis-id-settings.schema";

import {
  FockisIdService,
} from "./services/fockis-id.service";

import {
  UserSecurityService,
} from "./services/user-security.service";

import {
  UserSearchService,
} from "./services/user-search.service";

import {
  UserProfileService,
} from "./services/user-profile.service";

import { BlockVisibilityService } from "../friends/services/block-visibility.service";

import {
  getFockisCountry,
  getCallingCodeForCountry,
  normalizeCountryCode,
} from "./constants/fockis-country.constants";


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(FockisIdSettings.name)
    private readonly fockisIdSettingsModel: Model<FockisIdSettingsDocument>,

    private readonly fockisIdService: FockisIdService,

    private readonly userSecurityService: UserSecurityService,

    private readonly userSearchService: UserSearchService,

    private readonly userProfileService: UserProfileService,

    private readonly blockVisibilityService: BlockVisibilityService,
  ) {}


  /* ============================================================
   * USER LOOKUP
   * ============================================================ */

  async findById(
    userId: string,
  ) {
    return this.userProfileService.findById(
      userId,
    );
  }


  async findByEmail(
    email: string,
  ) {
    const normalized =
      String(email || "")
        .trim()
        .toLowerCase();

    return this.userModel.findOne({
      email: normalized,
    });
  }


  async getUserById(
    id: string,
  ) {
    return this.userProfileService.getUserById(
      id,
    );
  }


  /* ============================================================
   * USER CREATION
   *
   * Registration sends ONLY:
   *
   * {
   *   countryCode: "HT"
   * }
   *
   * Backend resolves:
   *
   * HT -> +509
   *
   * Backend generates:
   *
   * FK7H2K9A
   *
   * Public identity:
   *
   * +509-FK7H2K9A
   * ============================================================ */

  async create(
    user: Partial<User>,
  ) {
    /* ----------------------------------------------------------
     * COUNTRY
     * ---------------------------------------------------------- */

    const countryCode =
      normalizeCountryCode(
        user.countryCode,
      );

    if (!countryCode) {
      throw new BadRequestException(
        "Country is required when creating a new account.",
      );
    }

    const country =
      getFockisCountry(
        countryCode,
      );

    if (!country) {
      throw new BadRequestException(
        `Unsupported country code: ${countryCode}`,
      );
    }

    const callingCode =
      getCallingCodeForCountry(
        countryCode,
      );

    if (!callingCode) {
      throw new BadRequestException(
        "Unable to determine the calling code for the selected country.",
      );
    }


    /* ----------------------------------------------------------
     * FOCKIS ID
     *
     * The frontend must never generate this.
     * ---------------------------------------------------------- */

    const requestedFockisId =
      user.fockisId
        ? this.fockisIdService.normalizeFockisId(
            user.fockisId,
          )
        : null;

    let fockisId =
      requestedFockisId;


    if (fockisId) {
      if (
        !this.fockisIdService.isValidFockisId(
          fockisId,
        )
      ) {
        throw new BadRequestException(
          "Invalid Fockis ID.",
        );
      }

      const existing =
        await this.userModel.exists({
          fockisId,
        });

      if (existing) {
        throw new BadRequestException(
          "Fockis ID is already in use.",
        );
      }
    } else {
      /*
       * Use the FockisIdService so there is
       * only one source of truth for Fockis IDs.
       */
      fockisId =
        await this.fockisIdService.createFockisId();
    }


    /* ----------------------------------------------------------
     * CALLING CODE
     *
     * The backend owns this value.
     *
     * Frontend:
     * countryCode = HT
     *
     * Backend:
     * callingCode = +509
     *
     * We do NOT require the frontend to send
     * callingCode.
     * ---------------------------------------------------------- */

    const suppliedCallingCode =
      user.callingCode
        ? String(
            user.callingCode,
          ).trim()
        : null;

    if (
      suppliedCallingCode &&
      suppliedCallingCode !== callingCode
    ) {
      throw new BadRequestException(
        "Calling code does not match the selected country.",
      );
    }


    /* ----------------------------------------------------------
     * CREATE USER
     * ---------------------------------------------------------- */

    const created =
      await this.userModel.create({
        ...user,

        /*
         * Backend-generated permanent internal ID.
         */
        fockisId,

        /*
         * Backend-resolved country.
         */
        countryCode:
          country.code,

        /*
         * Backend-resolved international
         * calling code.
         */
        callingCode,

        /*
         * Payment fields.
         */
        fockisIdAccessPaid:
          Boolean(
            user.fockisIdAccessPaid,
          ),

        fockisIdAccessPaidAt:
          user.fockisIdAccessPaidAt ??
          null,

        fockisIdAccessPaymentId:
          user.fockisIdAccessPaymentId ??
          null,
      });


    /* ----------------------------------------------------------
     * RETURN USER
     * ---------------------------------------------------------- */

    return created;
  }


  /* ============================================================
   * FOCKIS ID
   * ============================================================ */

  async getFockisIdSettings() {
    return this.fockisIdService.getFockisIdSettings();
  }


  async getFockisIdPricing() {
    return this.fockisIdService.getFockisIdPricing();
  }


  async ensureFockisIdentity(
    user: UserDocument,
  ) {
    return this.fockisIdService.ensureFockisIdentity(
      user,
    );
  }


  async ensureFockisId(
    user: UserDocument,
  ) {
    return this.fockisIdService.ensureFockisId(
      user,
    );
  }


  async getOrCreateFockisId(
    userId: string,
  ) {
    return this.fockisIdService.getOrCreateFockisId(
      userId,
    );
  }


  async getFockisIdAccessStatus(
    userId: string,
  ) {
    return this.fockisIdService.getFockisIdAccessStatus(
      userId,
    );
  }


  async updateFockisCountry(
    userId: string,
    countryCode: string,
  ) {
    return this.fockisIdService.updateFockisCountry(
      userId,
      countryCode,
    );
  }


  async markFockisIdAccessPaid(
    userId: string,
    paymentId?: string,
  ) {
    return this.fockisIdService.markFockisIdAccessPaid(
      userId,
      paymentId,
    );
  }


  /* ============================================================
   * FOCKIS USER SEARCH
   * ============================================================ */

  async findByFockisId(
    fockisIdentity: string,
    currentUserId?: string,
  ) {
    return this.userSearchService.findByFockisId(
      fockisIdentity,
      currentUserId,
    );
  }


  async searchByFockisId(
    query: string,
    currentUserId?: string,
  ) {
    return this.userSearchService.searchByFockisId(
      query,
      currentUserId,
    );
  }


  async searchUsers(
    query: string,
    currentUserId: string,
  ) {
    const results =
      await this.userSearchService.searchUsers(
        query,
        currentUserId,
      );

    if (!Array.isArray(results)) {
      return results;
    }

    const visibleResults: typeof results = [];

    for (const user of results) {
      const targetUserId =
        user._id ??
        user.id;

      if (!targetUserId) {
        continue;
      }

      const canView =
        await this.blockVisibilityService.canView(
          String(currentUserId),
          String(targetUserId),
        );

      if (canView) {
        visibleResults.push(user);
      }
    }

    return visibleResults;
  }


  async getDiscoverUsers(
    userId: string,
  ) {
    const results =
      await this.userSearchService.getDiscoverUsers(
        userId,
      );

    if (!Array.isArray(results)) {
      return results;
    }

    const visibleResults: typeof results = [];

    for (const user of results) {
      const targetUserId =
        user._id ??
        user.id;

      if (!targetUserId) {
        continue;
      }

      const canView =
        await this.blockVisibilityService.canView(
          String(userId),
          String(targetUserId),
        );

      if (canView) {
        visibleResults.push(user);
      }
    }

    return visibleResults;
  }


  /* ============================================================
   * LOGIN SECURITY
   * ============================================================ */

  async checkLoginLockout(
    user: UserDocument,
  ) {
    return this.userSecurityService.checkLoginLockout(
      user,
    );
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
    return this.userSecurityService.recordFailedLogin(
      userId,
      options,
    );
  }


  async clearLoginLockout(
    userId: string,
  ) {
    return this.userSecurityService.clearLoginLockout(
      userId,
    );
  }


  async recordSuccessfulLogin(
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    return this.userSecurityService.recordSuccessfulLogin(
      userId,
      ip,
      userAgent,
    );
  }


  async updateActivity(
    userId: string,
  ) {
    return this.userSecurityService.updateActivity(
      userId,
    );
  }


  async markOffline(
    userId: string,
  ) {
    return this.userSecurityService.markOffline(
      userId,
    );
  }


  async forcePasswordChange(
    userId: string,
  ) {
    return this.userSecurityService.forcePasswordChange(
      userId,
    );
  }


  async setPasswordForSecurityReset(
    userId: string,
    newPassword: string,
    forceChange = true,
  ) {
    return this.userSecurityService.setPasswordForSecurityReset(
      userId,
      newPassword,
      forceChange,
    );
  }


  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.userSecurityService.changePassword(
      id,
      currentPassword,
      newPassword,
    );
  }


  /* ============================================================
   * PROFILE
   * ============================================================ */

  async updateUser(
    id: string,
    dto: any,
  ) {
    return this.userProfileService.updateUser(
      id,
      dto,
    );
  }


  async deleteUser(
    id: string,
  ) {
    return this.userProfileService.deleteUser(
      id,
    );
  }
}