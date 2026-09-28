import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

import {
  FockisIdSettings,
  FockisIdSettingsDocument,
} from "../../message-admin/schemas/fockis-id-settings.schema";

import {
  getFockisCountry,
  getCallingCodeForCountry,
  normalizeCountryCode,
  isValidCountryCode,
  formatPublicFockisId,
} from "../constants/fockis-country.constants";


@Injectable()
export class FockisIdService {
  private readonly fockisAlphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(FockisIdSettings.name)
    private readonly fockisIdSettingsModel: Model<FockisIdSettingsDocument>,
  ) {}


  /* ============================================================
   * COUNTRY VALIDATION
   * ============================================================ */

  private validateCountry(
    countryCode: string,
    callingCode?: string,
  ) {
    const normalized =
      normalizeCountryCode(
        countryCode,
      );

    if (!normalized) {
      throw new BadRequestException(
        "A valid two-letter country code is required.",
      );
    }

    if (
      !isValidCountryCode(
        normalized,
      )
    ) {
      throw new BadRequestException(
        `Country "${normalized}" is not supported by Fockis yet.`,
      );
    }

    const country =
      getFockisCountry(
        normalized,
      );

    if (!country) {
      throw new BadRequestException(
        `Country "${normalized}" is not supported by Fockis yet.`,
      );
    }

    if (
      callingCode !== undefined
    ) {
      const normalizedCallingCode =
        String(
          callingCode,
        )
          .trim()
          .replace(/\s/g, "");

      if (
        !/^\+[1-9]\d{0,14}$/.test(
          normalizedCallingCode,
        )
      ) {
        throw new BadRequestException(
          "Invalid calling code.",
        );
      }

      if (
        normalizedCallingCode !==
        country.callingCode
      ) {
        throw new BadRequestException(
          `Calling code ${normalizedCallingCode} does not match ${country.name}.`,
        );
      }
    }

    return country;
  }


  /* ============================================================
   * NORMALIZE FOCKIS ID
   * ============================================================ */

  normalizeFockisId(
    value: string,
  ): string {
    return String(
      value || "",
    )
      .trim()
      .toUpperCase()
      .replace(
        /[\s-]/g,
        "",
      );
  }


  /* ============================================================
   * VALIDATE INTERNAL FOCKIS ID
   * ============================================================ */

  isValidFockisId(
    value: string,
  ): boolean {
    return /^FK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(
      this.normalizeFockisId(
        value,
      ),
    );
  }


  /* ============================================================
   * GENERATE FOCKIS ID
   * ============================================================ */

  private generateFockisId(): string {
    let result = "FK";

    for (
      let i = 0;
      i < 6;
      i += 1
    ) {
      const index =
        Math.floor(
          Math.random() *
            this.fockisAlphabet.length,
        );

      result +=
        this.fockisAlphabet[
          index
        ];
    }

    return result;
  }


  /* ============================================================
   * CREATE UNIQUE FOCKIS ID
   *
   * Public because UsersService.create()
   * uses the FockisIdService as the single
   * source of truth for ID generation.
   * ============================================================ */

  async createFockisId(): Promise<string> {
    for (
      let attempt = 0;
      attempt < 30;
      attempt += 1
    ) {
      const id =
        this.generateFockisId();

      const exists =
        await this.userModel.exists({
          fockisId: id,
        });

      if (!exists) {
        return id;
      }
    }

    throw new InternalServerErrorException(
      "Unable to generate a unique Fockis ID.",
    );
  }


  /* ============================================================
   * PUBLIC FOCKIS ID
   * ============================================================ */

  private getPublicFockisId(
    fockisId: string,
    callingCode: string,
  ): string {
    return (
      formatPublicFockisId(
        fockisId,
        callingCode,
      ) ||
      fockisId
    );
  }


  /* ============================================================
   * ENSURE FOCKIS ID + COUNTRY
   *
   * New accounts must have a country.
   *
   * Legacy users without a country are temporarily
   * supported with US as the compatibility fallback.
   * ============================================================ */

  async ensureFockisIdentity(
    user: UserDocument,
  ) {
    let fockisId =
      this.normalizeFockisId(
        user.fockisId || "",
      );


    /* ----------------------------------------------------------
     * Generate missing Fockis ID
     * ---------------------------------------------------------- */

    if (
      !this.isValidFockisId(
        fockisId,
      )
    ) {
      let generated:
        | string
        | null = null;

      for (
        let attempt = 0;
        attempt < 10;
        attempt += 1
      ) {
        const candidate =
          await this.createFockisId();

        try {
          const updated =
            await this.userModel.findOneAndUpdate(
              {
                _id: user._id,

                $or: [
                  {
                    fockisId: {
                      $exists: false,
                    },
                  },
                  {
                    fockisId: null,
                  },
                  {
                    fockisId: "",
                  },
                ],
              },
              {
                $set: {
                  fockisId:
                    candidate,
                },
              },
              {
                new: true,
              },
            );

          if (
            updated?.fockisId
          ) {
            generated =
              updated.fockisId;
            break;
          }

          const latest =
            await this.userModel.findById(
              user._id,
            );

          if (
            latest?.fockisId &&
            this.isValidFockisId(
              latest.fockisId,
            )
          ) {
            generated =
              latest.fockisId;
            break;
          }
        } catch (
          error: any
        ) {
          if (
            error?.code ===
            11000
          ) {
            continue;
          }

          throw error;
        }
      }

      if (!generated) {
        throw new InternalServerErrorException(
          "Unable to create the user's Fockis ID.",
        );
      }

      fockisId =
        generated;
    }


    /* ----------------------------------------------------------
     * COUNTRY
     * ---------------------------------------------------------- */

    const existingCountryCode =
      normalizeCountryCode(
        user.countryCode,
      );

    let country;


    if (
      existingCountryCode &&
      isValidCountryCode(
        existingCountryCode,
      )
    ) {
      country =
        this.validateCountry(
          existingCountryCode,
          user.callingCode ||
            undefined,
        );
    } else {
      /*
       * Compatibility fallback ONLY for legacy
       * users who existed before country selection
       * was required.
       *
       * New registration never reaches this branch
       * because UsersService.create() requires country.
       */
      country =
        getFockisCountry(
          "US",
        );

      if (!country) {
        throw new InternalServerErrorException(
          "Default Fockis country configuration is missing.",
        );
      }
    }


    /* ----------------------------------------------------------
     * CALLING CODE
     * ---------------------------------------------------------- */

    const callingCode =
      getCallingCodeForCountry(
        country.code,
      );

    if (!callingCode) {
      throw new InternalServerErrorException(
        "Unable to determine the calling code for the user's country.",
      );
    }


    /* ----------------------------------------------------------
     * UPDATE COUNTRY IF NECESSARY
     * ---------------------------------------------------------- */

    const needsCountryUpdate =
      user.countryCode !==
        country.code ||
      user.callingCode !==
        callingCode;

    if (
      needsCountryUpdate
    ) {
      await this.userModel.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            countryCode:
              country.code,

            callingCode,
          },
        },
      );
    }


    /* ----------------------------------------------------------
     * COMPLETE PUBLIC IDENTITY
     * ---------------------------------------------------------- */

    return {
      fockisId,

      countryCode:
        country.code,

      callingCode,

      countryName:
        country.name,

      publicFockisId:
        this.getPublicFockisId(
          fockisId,
          callingCode,
        ),
    };
  }


  /* ============================================================
   * ENSURE FOCKIS ID ONLY
   * ============================================================ */

  async ensureFockisId(
    user: UserDocument,
  ): Promise<string> {
    const identity =
      await this.ensureFockisIdentity(
        user,
      );

    return identity.fockisId;
  }


  /* ============================================================
   * GET OR CREATE FOCKIS ID
   * ============================================================ */

  async getOrCreateFockisId(
    userId: string,
  ): Promise<string> {
    if (
      !isValidObjectId(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    return this.ensureFockisId(
      user,
    );
  }


  /* ============================================================
   * FOCKIS ID SETTINGS
   * ============================================================ */

  async getFockisIdSettings() {
    let settings =
      await this.fockisIdSettingsModel.findOne();

    if (!settings) {
      settings =
        await this.fockisIdSettingsModel.create({
          price: null,
        });
    }

    return settings;
  }


  /* ============================================================
   * FOCKIS ID PRICING
   * ============================================================ */

  async getFockisIdPricing() {
    const settings =
      await this.getFockisIdSettings();

    const rawPrice =
      Number(
        settings?.price ?? 0,
      );

    const price =
      Number.isFinite(
        rawPrice,
      ) &&
      rawPrice >= 0
        ? rawPrice
        : 0;

    const rawCurrency =
      String(
        (settings as any)
          ?.currency ||
          "USD",
      )
        .trim()
        .toLowerCase();

    const currency =
      /^[a-z]{3}$/.test(
        rawCurrency,
      )
        ? rawCurrency
        : "usd";

    return {
      price,

      currency,

      oneTime: true,

      recurring: false,

      requirePayment:
        price > 0,
    };
  }


  /* ============================================================
   * FOCKIS ID ACCESS STATUS
   * ============================================================ */

  async getFockisIdAccessStatus(
    userId: string,
  ) {
    if (
      !isValidObjectId(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const identity =
      await this.ensureFockisIdentity(
        user,
      );

    const pricing =
      await this.getFockisIdPricing();

    const accessPaid =
      Boolean(
        user.fockisIdAccessPaid,
      );

    const requiresPayment =
      pricing.requirePayment &&
      !accessPaid;

    const accessGranted =
      accessPaid ||
      !pricing.requirePayment;

    return {
      fockisId:
        accessGranted
          ? identity.fockisId
          : null,

      publicFockisId:
        accessGranted
          ? identity.publicFockisId
          : null,

      countryCode:
        identity.countryCode,

      callingCode:
        identity.callingCode,

      countryName:
        identity.countryName,

      accessPaid,

      requiresPayment,

      accessGranted,

      price:
        pricing.price,

      currency:
        pricing.currency,

      oneTime:
        pricing.oneTime,

      recurring:
        pricing.recurring,

      requirePayment:
        pricing.requirePayment,
    };
  }


  /* ============================================================
   * UPDATE FOCKIS COUNTRY
   * ============================================================ */

  async updateFockisCountry(
    userId: string,
    countryCode: string,
  ) {
    if (
      !isValidObjectId(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const country =
      this.validateCountry(
        countryCode,
      );

    const identity =
      await this.ensureFockisIdentity(
        user,
      );

    const callingCode =
      getCallingCodeForCountry(
        country.code,
      );

    if (!callingCode) {
      throw new InternalServerErrorException(
        "Unable to determine the calling code for the selected country.",
      );
    }

    await this.userModel.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          countryCode:
            country.code,

          callingCode,
        },
      },
    );

    return {
      success: true,

      fockisId:
        identity.fockisId,

      publicFockisId:
        this.getPublicFockisId(
          identity.fockisId,
          callingCode,
        ),

      countryCode:
        country.code,

      callingCode,

      countryName:
        country.name,
    };
  }


  /* ============================================================
   * MARK FOCKIS ID ACCESS AS PAID
   * ============================================================ */

  async markFockisIdAccessPaid(
    userId: string,
    paymentId?: string,
  ) {
    if (
      !isValidObjectId(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const identity =
      await this.ensureFockisIdentity(
        user,
      );

    if (
      user.fockisIdAccessPaid
    ) {
      return {
        success: true,

        alreadyPaid: true,

        ...identity,
      };
    }

    user.fockisIdAccessPaid =
      true;

    user.fockisIdAccessPaidAt =
      new Date();

    if (paymentId) {
      user.fockisIdAccessPaymentId =
        paymentId;
    }

    await user.save();

    return {
      success: true,

      alreadyPaid: false,

      ...identity,
    };
  }
}