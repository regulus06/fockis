
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { User, UserDocument } from "../user.schema";
import { BlockVisibilityService } from "../../friends/services/block-visibility.service";

const FOCKIS_COUNTRIES: Record<
  string,
  { countryCode: string; callingCode: string; name: string }
> = {
  US: { countryCode: "US", callingCode: "+1", name: "United States" },
  CA: { countryCode: "CA", callingCode: "+1", name: "Canada" },
  HT: { countryCode: "HT", callingCode: "+509", name: "Haiti" },
  DO: { countryCode: "DO", callingCode: "+1", name: "Dominican Republic" },
  FR: { countryCode: "FR", callingCode: "+33", name: "France" },
  GB: { countryCode: "GB", callingCode: "+44", name: "United Kingdom" },
  DE: { countryCode: "DE", callingCode: "+49", name: "Germany" },
  ES: { countryCode: "ES", callingCode: "+34", name: "Spain" },
  IT: { countryCode: "IT", callingCode: "+39", name: "Italy" },
  BR: { countryCode: "BR", callingCode: "+55", name: "Brazil" },
  MX: { countryCode: "MX", callingCode: "+52", name: "Mexico" },
  JM: { countryCode: "JM", callingCode: "+1", name: "Jamaica" },
  PR: { countryCode: "PR", callingCode: "+1", name: "Puerto Rico" },
  IN: { countryCode: "IN", callingCode: "+91", name: "India" },
  CN: { countryCode: "CN", callingCode: "+86", name: "China" },
  JP: { countryCode: "JP", callingCode: "+81", name: "Japan" },
  KR: { countryCode: "KR", callingCode: "+82", name: "South Korea" },
  NG: { countryCode: "NG", callingCode: "+234", name: "Nigeria" },
  GH: { countryCode: "GH", callingCode: "+233", name: "Ghana" },
  KE: { countryCode: "KE", callingCode: "+254", name: "Kenya" },
  ZA: { countryCode: "ZA", callingCode: "+27", name: "South Africa" },
};

const PUBLIC_USER_FIELDS = [
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
  "isPrivate",
  "followersCount",
  "friendsCount",
].join(" ");

function getFockisCountry(countryCode?: string) {
  const normalized = String(countryCode || "").trim().toUpperCase();
  return FOCKIS_COUNTRIES[normalized] ?? FOCKIS_COUNTRIES.US;
}

function formatFockisId(
  fockisId: string | null,
  callingCode: string,
): string | null {
  if (!fockisId) return null;
  return callingCode ? `${callingCode}-${fockisId}` : fockisId;
}

@Injectable()
export class UserSearchService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly blockVisibilityService: BlockVisibilityService,
  ) {}

  private normalizeFockisIdentity(value: string) {
    const cleaned = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s()-]/g, "");

    const match = cleaned.match(
      /^(\+[1-9]\d{0,14})?(FK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})$/,
    );

    if (!match) {
      throw new BadRequestException("Invalid Fockis ID.");
    }

    return {
      callingCode: match[1] ?? null,
      fockisId: match[2],
    };
  }

  private buildUserResult(user: any) {
    const country = getFockisCountry(user.countryCode);
    const callingCode = String(user.callingCode || country.callingCode);
    const fockisId = user.fockisId || null;
    const publicFockisId = formatFockisId(fockisId, callingCode);
    const firstName = String(user.firstName || "");
    const lastName = String(user.lastName || "");
    const username = String(user.username || "");
    const name = `${firstName} ${lastName}`.trim() || username;
    const isPrivate = user.isPrivate === true;
    const isOnline = !isPrivate && Boolean(user.online);

    return {
      id: String(user._id),
      _id: String(user._id),
      fockisId,
      publicFockisId,
      countryCode: country.countryCode,
      callingCode,
      countryName: country.name,
      username,
      firstName,
      lastName,
      name,
      displayName: name,
      profilePicture: user.profilePicture || "",
      avatar: user.profilePicture || "",
      bio: isPrivate ? "" : String(user.bio || ""),
      online: isOnline,
      presence: isOnline ? "online" : "offline",
      lastSeen:
        !isPrivate && user.lastSeen
          ? new Date(user.lastSeen).toISOString()
          : null,
      verified: Boolean(user.verified),
      premium: Boolean(user.premium),
      accountType: user.accountType,
      isActive: user.isActive !== false,
      isPrivate,
      followersCount: Number(user.followersCount || 0),
      friendsCount: Number(user.friendsCount || 0),
    };
  }

  private activeUserFilter() {
    return {
      $or: [
        { isActive: true },
        { isActive: { $exists: false } },
      ],
    };
  }

  private async filterVisibleUsers(
    users: any[],
    currentUserId: string,
  ) {
    const visible: any[] = [];

    for (const user of users) {
      const allowed = await this.blockVisibilityService.canView(
        currentUserId,
        String(user._id),
      );

      if (allowed) {
        visible.push(user);
      }
    }

    return visible;
  }

  private async findVisibleUser(
    query: Record<string, any>,
    currentUserId: string,
  ) {
    const user = await this.userModel
      .findOne(query)
      .select(PUBLIC_USER_FIELDS)
      .lean()
      .exec();

    if (!user) return null;

    const allowed = await this.blockVisibilityService.canView(
      currentUserId,
      String(user._id),
    );

    return allowed ? user : null;
  }

  async findByFockisId(
    fockisIdentity: string,
    currentUserId?: string,
  ) {
    if (!currentUserId || !isValidObjectId(currentUserId)) {
      throw new BadRequestException(
        "A valid authenticated user is required.",
      );
    }

    const { callingCode, fockisId } =
      this.normalizeFockisIdentity(fockisIdentity);

    const query: Record<string, any> = {
      fockisId,
      _id: { $ne: currentUserId },
      ...this.activeUserFilter(),
    };

    if (callingCode) {
      query.callingCode = callingCode;
    }

    const user = await this.findVisibleUser(query, currentUserId);

    if (!user) {
      throw new NotFoundException("Fockis user not found.");
    }

    return this.buildUserResult(user);
  }

  async searchByFockisId(
    queryValue: string,
    currentUserId?: string,
  ) {
    if (!currentUserId || !isValidObjectId(currentUserId)) {
      throw new BadRequestException(
        "A valid authenticated user is required.",
      );
    }

    const { callingCode, fockisId } =
      this.normalizeFockisIdentity(queryValue);

    const query: Record<string, any> = {
      fockisId,
      _id: { $ne: currentUserId },
      ...this.activeUserFilter(),
    };

    if (callingCode) {
      query.callingCode = callingCode;
    }

    const users = await this.userModel
      .find(query)
      .select(PUBLIC_USER_FIELDS)
      .limit(20)
      .lean()
      .exec();

    const visible = await this.filterVisibleUsers(
      users,
      currentUserId,
    );

    return visible.map((user) => this.buildUserResult(user));
  }

  async searchUsers(
    queryValue: string,
    currentUserId: string,
  ) {
    const value = String(queryValue || "").trim();

    if (!value) return [];

    if (!isValidObjectId(currentUserId)) {
      throw new BadRequestException("Invalid current user ID.");
    }

    const safeValue = value.slice(0, 100);
    const escaped = safeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escaped}`, "i");

    const baseQuery = {
      $and: [
        this.activeUserFilter(),
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { firstName: regex },
            { lastName: regex },
            { username: regex },
            { fockisId: regex },
          ],
        },
      ],
    };

    const users = await this.userModel
      .find(baseQuery)
      .select(PUBLIC_USER_FIELDS)
      .limit(50)
      .lean()
      .exec();

    const results = [...users];

    if (safeValue.includes(" ")) {
      const parts = safeValue.split(/\s+/).filter(Boolean);

      if (parts.length >= 2) {
        const first = parts[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const last = parts.slice(1).join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const fullNameRegex = new RegExp(
          `^${first}\\s+${last}`,
          "i",
        );

        const reverseNameRegex = new RegExp(
          `^${last}\\s+${first}`,
          "i",
        );

        const nameUsers = await this.userModel
          .find({
            $and: [
              this.activeUserFilter(),
              { _id: { $ne: currentUserId } },
              {
                $or: [
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            { $ifNull: ["$firstName", ""] },
                            " ",
                            { $ifNull: ["$lastName", ""] },
                          ],
                        },
                        regex: fullNameRegex,
                      },
                    },
                  },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            { $ifNull: ["$firstName", ""] },
                            " ",
                            { $ifNull: ["$lastName", ""] },
                          ],
                        },
                        regex: reverseNameRegex,
                      },
                    },
                  },
                ],
              },
            ],
          })
          .select(PUBLIC_USER_FIELDS)
          .limit(50)
          .lean()
          .exec();

        results.push(...nameUsers);
      }
    }

    const unique = new Map<string, any>();

    for (const user of results) {
      unique.set(String(user._id), user);
    }

    const candidates = Array.from(unique.values()).slice(0, 50);
    const visible = await this.filterVisibleUsers(
      candidates,
      currentUserId,
    );

    return visible
      .slice(0, 20)
      .map((user) => this.buildUserResult(user));
  }

  async getDiscoverUsers(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException("Invalid user ID.");
    }

    const currentUser = await this.userModel
      .findById(userId)
      .select("friends following")
      .lean()
      .exec();

    if (!currentUser) {
      throw new NotFoundException("User not found.");
    }

    const excludedIds = [
      userId,
      ...((currentUser as any).friends || []),
      ...((currentUser as any).following || []),
    ]
      .map((id: any) => String(id))
      .filter((id: string) => isValidObjectId(id));

    const users = await this.userModel
      .find({
        $and: [
          this.activeUserFilter(),
          { _id: { $nin: excludedIds } },
        ],
      })
      .select(PUBLIC_USER_FIELDS)
      .limit(50)
      .lean()
      .exec();

    const visible = await this.filterVisibleUsers(users, userId);

    return visible.slice(0, 6).map((user) => ({
      ...this.buildUserResult(user),
      reason: Number((user as any).followersCount || 0) > 0
        ? "connections"
        : "New member",
    }));
  }
}
