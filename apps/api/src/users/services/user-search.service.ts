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


/*
 * ============================================================
 * FOCKIS COUNTRY DATA
 * ============================================================
 *
 * The public Fockis identity is:
 *
 *     +509-FK7H2K9A
 *
 * The actual database identity remains:
 *
 *     FK7H2K9A
 *
 * Country code and calling code are separate fields.
 */

const FOCKIS_COUNTRIES: Record<
  string,
  {
    countryCode: string;
    callingCode: string;
    name: string;
  }
> = {
  US: {
    countryCode: "US",
    callingCode: "+1",
    name: "United States",
  },

  CA: {
    countryCode: "CA",
    callingCode: "+1",
    name: "Canada",
  },

  HT: {
    countryCode: "HT",
    callingCode: "+509",
    name: "Haiti",
  },

  DO: {
    countryCode: "DO",
    callingCode: "+1",
    name: "Dominican Republic",
  },

  FR: {
    countryCode: "FR",
    callingCode: "+33",
    name: "France",
  },

  GB: {
    countryCode: "GB",
    callingCode: "+44",
    name: "United Kingdom",
  },

  DE: {
    countryCode: "DE",
    callingCode: "+49",
    name: "Germany",
  },

  ES: {
    countryCode: "ES",
    callingCode: "+34",
    name: "Spain",
  },

  IT: {
    countryCode: "IT",
    callingCode: "+39",
    name: "Italy",
  },

  BR: {
    countryCode: "BR",
    callingCode: "+55",
    name: "Brazil",
  },

  MX: {
    countryCode: "MX",
    callingCode: "+52",
    name: "Mexico",
  },

  JM: {
    countryCode: "JM",
    callingCode: "+1",
    name: "Jamaica",
  },

  PR: {
    countryCode: "PR",
    callingCode: "+1",
    name: "Puerto Rico",
  },

  IN: {
    countryCode: "IN",
    callingCode: "+91",
    name: "India",
  },

  CN: {
    countryCode: "CN",
    callingCode: "+86",
    name: "China",
  },

  JP: {
    countryCode: "JP",
    callingCode: "+81",
    name: "Japan",
  },

  KR: {
    countryCode: "KR",
    callingCode: "+82",
    name: "South Korea",
  },

  NG: {
    countryCode: "NG",
    callingCode: "+234",
    name: "Nigeria",
  },

  GH: {
    countryCode: "GH",
    callingCode: "+233",
    name: "Ghana",
  },

  KE: {
    countryCode: "KE",
    callingCode: "+254",
    name: "Kenya",
  },

  ZA: {
    countryCode: "ZA",
    callingCode: "+27",
    name: "South Africa",
  },
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getFockisCountry(
  countryCode?: string,
) {
  const normalized =
    String(countryCode || "")
      .trim()
      .toUpperCase();

  return (
    FOCKIS_COUNTRIES[normalized] ??
    FOCKIS_COUNTRIES.US
  );
}


function formatFockisId(
  fockisId: string,
  callingCode: string,
) {
  if (!fockisId) {
    return null;
  }

  if (!callingCode) {
    return fockisId;
  }

  return `${callingCode}-${fockisId}`;
}


/*
 * ============================================================
 * USER SEARCH SERVICE
 * ============================================================
 */

@Injectable()
export class UserSearchService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}


  /*
   * ============================================================
   * FOCKIS ID NORMALIZATION
   * ============================================================
   *
   * Accepted:
   *
   * FK7H2K9A
   * +509-FK7H2K9A
   * +509 FK7H2K9A
   * +509FK7H2K9A
   *
   * The phone number is NOT required.
   */

  private normalizeFockisIdentity(
    value: string,
  ) {
    const raw =
      String(value || "")
        .trim()
        .toUpperCase();

    const cleaned =
      raw.replace(
        /[\s()-]/g,
        "",
      );

    const match =
      cleaned.match(
        /^(\+[1-9]\d{0,14})?(FK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})$/,
      );

    if (!match) {
      throw new BadRequestException(
        "Invalid Fockis ID.",
      );
    }

    return {
      callingCode:
        match[1] ?? null,

      fockisId:
        match[2],
    };
  }


  /*
   * ============================================================
   * BUILD PUBLIC USER RESULT
   * ============================================================
   */

  private buildUserResult(
    user: any,
  ) {
    const country =
      getFockisCountry(
        user.countryCode,
      );

    const callingCode =
      user.callingCode ||
      country.callingCode;

    const fockisId =
      user.fockisId || null;

    const publicFockisId =
      fockisId
        ? formatFockisId(
            fockisId,
            callingCode,
          )
        : null;

    const firstName =
      user.firstName || "";

    const lastName =
      user.lastName || "";

    const name =
      `${firstName} ${lastName}`.trim() ||
      user.username ||
      "";

    const lastSeen =
      user.lastSeen
        ? new Date(
            user.lastSeen,
          ).toISOString()
        : null;

    return {
      id: String(user._id),

      _id: String(user._id),

      /*
       * Internal Fockis ID.
       */
      fockisId,

      /*
       * Public identity.
       *
       * Example:
       * +509-FK7H2K9A
       */
      publicFockisId,

      countryCode:
        country.countryCode,

      callingCode,

      countryName:
        country.name,

      username:
        user.username,

      firstName,

      lastName,

      name,

      displayName:
        name,

      email:
        user.email,

      profilePicture:
        user.profilePicture || "",

      avatar:
        user.profilePicture || "",

      bio:
        user.bio || "",

      online:
        Boolean(user.online),

      presence:
        user.online
          ? "online"
          : "offline",

      lastSeen,

      verified:
        Boolean(user.verified),

      premium:
        Boolean(user.premium),

      accountType:
        user.accountType,

      isActive:
        user.isActive !== false,
    };
  }


  /*
   * ============================================================
   * FIND BY FOCKIS ID
   * ============================================================
   */

  async findByFockisId(
    fockisIdentity: string,
    currentUserId?: string,
  ) {
    const {
      callingCode,
      fockisId,
    } =
      this.normalizeFockisIdentity(
        fockisIdentity,
      );

    const query: any = {
      fockisId,

      $or: [
        {
          isActive: true,
        },
        {
          isActive: {
            $exists: false,
          },
        },
      ],
    };

    /*
     * If the user entered a public identity
     * such as +509-FK7H2K9A, verify the calling
     * code as well.
     */
    if (callingCode) {
      query.callingCode =
        callingCode;
    }

    /*
     * Do not return the current user.
     */
    if (
      currentUserId &&
      isValidObjectId(
        currentUserId,
      )
    ) {
      query._id = {
        $ne: currentUserId,
      };
    }

    const user =
      await this.userModel
        .findOne(query)
        .select(
          [
            "_id",
            "fockisId",
            "countryCode",
            "callingCode",
            "username",
            "firstName",
            "lastName",
            "profilePicture",
            "bio",
            "online",
            "lastSeen",
            "verified",
            "premium",
            "accountType",
            "isActive",
            "email",
          ].join(" "),
        )
        .lean();

    if (!user) {
      throw new NotFoundException(
        "Fockis user not found.",
      );
    }

    return this.buildUserResult(
      user,
    );
  }


  /*
   * ============================================================
   * SEARCH BY FOCKIS ID
   * ============================================================
   */

  async searchByFockisId(
    queryValue: string,
    currentUserId?: string,
  ) {
    const {
      callingCode,
      fockisId,
    } =
      this.normalizeFockisIdentity(
        queryValue,
      );

    const query: any = {
      fockisId,

      $or: [
        {
          isActive: true,
        },
        {
          isActive: {
            $exists: false,
          },
        },
      ],
    };

    if (callingCode) {
      query.callingCode =
        callingCode;
    }

    if (
      currentUserId &&
      isValidObjectId(
        currentUserId,
      )
    ) {
      query._id = {
        $ne: currentUserId,
      };
    }

    const users =
      await this.userModel
        .find(query)
        .limit(20)
        .lean();

    return users.map(
      (user) =>
        this.buildUserResult(
          user,
        ),
    );
  }


  /*
   * ============================================================
   * GENERAL USER SEARCH
   * ============================================================
   *
   * Searches:
   *
   * - first name
   * - last name
   * - username
   * - email
   * - Fockis ID
   *
   * Also supports:
   *
   * "John Smith"
   * "Smith John"
   */

  async searchUsers(
    queryValue: string,
    currentUserId: string,
  ) {
    const value =
      String(queryValue || "")
        .trim();

    if (!value) {
      return [];
    }

    /*
     * Escape regex characters safely.
     */
    const escaped =
      value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    const regex =
      new RegExp(
        `^${escaped}`,
        "i",
      );

    /*
     * IMPORTANT:
     *
     * We use $and containing separate $or
     * clauses. This avoids the previous error:
     *
     * "An object literal cannot have multiple
     * properties with the same name."
     */
    const baseQuery: any = {
      _id: {
        $ne: currentUserId,
      },

      $and: [
        {
          $or: [
            {
              isActive: true,
            },
            {
              isActive: {
                $exists: false,
              },
            },
          ],
        },

        {
          $or: [
            {
              firstName: regex,
            },
            {
              lastName: regex,
            },
            {
              username: regex,
            },
            {
              email: regex,
            },
            {
              fockisId: regex,
            },
          ],
        },
      ],
    };

    const users =
      await this.userModel
        .find(baseQuery)
        .limit(50)
        .lean();

    let results = [
      ...users,
    ];


    /*
     * ==========================================================
     * FULL NAME SEARCH
     * ==========================================================
     */

    if (value.includes(" ")) {
      const parts =
        value
          .split(/\s+/)
          .filter(Boolean);

      if (parts.length >= 2) {
        const first =
          parts[0];

        const last =
          parts
            .slice(1)
            .join(" ");

        /*
         * Escape each name separately.
         */
        const escapedFirst =
          first.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

        const escapedLast =
          last.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

        const fullNameRegex =
          new RegExp(
            `^${escapedFirst}\\s+${escapedLast}`,
            "i",
          );

        const reverseNameRegex =
          new RegExp(
            `^${escapedLast}\\s+${escapedFirst}`,
            "i",
          );

        /*
         * IMPORTANT:
         *
         * There is now only ONE $and.
         *
         * Inside it:
         *
         * 1. Active-user condition
         * 2. Full-name condition
         *
         * No duplicate $or properties.
         */
        const nameUsers =
          await this.userModel
            .find({
              _id: {
                $ne: currentUserId,
              },

              $and: [
                {
                  $or: [
                    {
                      isActive: true,
                    },
                    {
                      isActive: {
                        $exists: false,
                      },
                    },
                  ],
                },

                {
                  $or: [
                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              {
                                $ifNull: [
                                  "$firstName",
                                  "",
                                ],
                              },
                              " ",
                              {
                                $ifNull: [
                                  "$lastName",
                                  "",
                                ],
                              },
                            ],
                          },

                          regex:
                            fullNameRegex,
                        },
                      },
                    },

                    {
                      $expr: {
                        $regexMatch: {
                          input: {
                            $concat: [
                              {
                                $ifNull: [
                                  "$firstName",
                                  "",
                                ],
                              },
                              " ",
                              {
                                $ifNull: [
                                  "$lastName",
                                  "",
                                ],
                              },
                            ],
                          },

                          regex:
                            reverseNameRegex,
                        },
                      },
                    },
                  ],
                },
              ],
            })
            .limit(50)
            .lean();

        results = [
          ...results,
          ...nameUsers,
        ];
      }
    }


    /*
     * ==========================================================
     * REMOVE DUPLICATES
     * ==========================================================
     */

    const unique =
      new Map<
        string,
        any
      >();

    for (const user of results) {
      unique.set(
        String(user._id),
        user,
      );
    }


    /*
     * ==========================================================
     * FINAL RESULT
     * ==========================================================
     */

    return Array.from(
      unique.values(),
    )
      .slice(0, 20)
      .map(
        (user) =>
          this.buildUserResult(
            user,
          ),
      );
  }


  /*
   * ============================================================
   * DISCOVER USERS
   * ============================================================
   */

  async getDiscoverUsers(
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

    const currentUser =
      await this.userModel
        .findById(userId)
        .select(
          "friends following",
        )
        .lean();

    if (!currentUser) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const excludedIds = [
      userId,
      ...(currentUser.friends || []),
      ...(currentUser.following || []),
    ];

    const validExcludedIds =
      excludedIds.filter(
        (id) =>
          isValidObjectId(
            id,
          ),
      );

    const users =
      await this.userModel
        .find({
          _id: {
            $nin:
              validExcludedIds,
          },

          $or: [
            {
              isActive: true,
            },
            {
              isActive: {
                $exists: false,
              },
            },
          ],
        })
        .select(
          [
            "_id",
            "fockisId",
            "countryCode",
            "callingCode",
            "username",
            "firstName",
            "lastName",
            "profilePicture",
            "bio",
            "online",
            "lastSeen",
            "verified",
            "premium",
            "accountType",
            "isActive",
            "followersCount",
            "friendsCount",
          ].join(" "),
        )
        .limit(6)
        .lean();

    return users.map(
      (user) => ({
        ...this.buildUserResult(
          user,
        ),

        followersCount:
          user.followersCount ||
          0,

        friendsCount:
          user.friendsCount ||
          0,

        reason:
          (user.followersCount || 0) >
          0
            ? "connections"
            : "New member",
      }),
    );
  }
}