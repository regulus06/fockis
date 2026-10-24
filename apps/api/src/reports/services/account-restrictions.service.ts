import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import {
  AccountRestriction,
  AccountRestrictionDocument,
} from "../schemas/account-restriction.schema";
import { RestrictionType } from "../reports.constants";

/**
 * Applies and lifts moderation restrictions.
 *
 * Suspensions are written onto the EXISTING account-status fields so the
 * rest of the platform needs no new checks:
 *   temporary -> User.lockedUntil (JwtStrategy rejects locked accounts)
 *   permanent -> User.isActive = false (JwtStrategy rejects inactive ones)
 * Posting restrictions are checked by assertCanPost().
 */
@Injectable()
export class AccountRestrictionsService {
  private readonly logger = new Logger(AccountRestrictionsService.name);

  constructor(
    @InjectModel(AccountRestriction.name)
    private readonly restrictionModel: Model<AccountRestrictionDocument>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private get userModel() {
    return this.connection.models["User"];
  }

  /** Active restrictions for a user at `now` (expired ones are ignored). */
  async activeFor(userId: string, now = new Date()) {
    if (!Types.ObjectId.isValid(userId)) return [];

    return this.restrictionModel
      .find({
        userId: new Types.ObjectId(userId),
        active: true,
        $or: [{ until: null }, { until: { $gt: now } }],
      })
      .lean()
      .exec();
  }

  /** Throws 403 when the user may not create posts right now. */
  async assertCanPost(userId: string | undefined | null): Promise<void> {
    if (!userId) return;

    const active = await this.activeFor(String(userId));
    const blocking = active.find(
      (item) => item.type === RestrictionType.POSTING || item.type === RestrictionType.SUSPENSION,
    );

    if (blocking) {
      const until = blocking.until ? new Date(blocking.until) : null;

      throw new ForbiddenException(
        until
          ? `Your account can't create posts until ${until.toISOString()} because of a moderation decision. You can review or appeal it in your moderation center.`
          : "Your account can't create posts because of a moderation decision. You can review or appeal it in your moderation center.",
      );
    }
  }

  async restrictPosting(userId: string, until: Date, caseId: string, actorId: string, reason: string) {
    return this.restrictionModel.create({
      userId: new Types.ObjectId(userId),
      type: RestrictionType.POSTING,
      until,
      active: true,
      caseId: new Types.ObjectId(caseId),
      reason,
      createdBy: actorId,
    });
  }

  async suspend(userId: string, until: Date | null, caseId: string, actorId: string, reason: string) {
    const userModel = this.userModel;

    if (!userModel) {
      throw new Error("User model is not registered.");
    }

    const update = until ? { $set: { lockedUntil: until } } : { $set: { isActive: false } };
    const result = await userModel.updateOne({ _id: new Types.ObjectId(userId) }, update).exec();

    if (!result.matchedCount) {
      throw new Error("Account not found.");
    }

    return this.restrictionModel.create({
      userId: new Types.ObjectId(userId),
      type: RestrictionType.SUSPENSION,
      until,
      active: true,
      caseId: new Types.ObjectId(caseId),
      reason,
      createdBy: actorId,
    });
  }

  /**
   * Lifts every active restriction created by one case and restores the
   * account-status fields this case changed. Returns what was lifted.
   */
  async liftForCase(caseId: string, actorId: string) {
    const restrictions = await this.restrictionModel
      .find({ caseId: new Types.ObjectId(caseId), active: true })
      .lean()
      .exec();

    const userModel = this.userModel;

    for (const restriction of restrictions) {
      if (restriction.type === RestrictionType.SUSPENSION && userModel) {
        if (restriction.until) {
          // Only clear the lock this case set (a later, longer lock stays).
          await userModel
            .updateOne(
              { _id: restriction.userId, lockedUntil: { $lte: restriction.until } },
              { $set: { lockedUntil: null } },
            )
            .exec();
        } else {
          await userModel.updateOne({ _id: restriction.userId }, { $set: { isActive: true } }).exec();
        }
      }
    }

    if (restrictions.length) {
      await this.restrictionModel
        .updateMany(
          { _id: { $in: restrictions.map((item) => item._id) } },
          { $set: { active: false, liftedAt: new Date(), liftedBy: actorId } },
        )
        .exec();
    }

    return restrictions.map((item) => ({ type: item.type, until: item.until ?? null }));
  }

  /** Distinct users with a restriction in force (for the dashboard). */
  async countRestrictedAccounts(now = new Date()): Promise<number> {
    try {
      const ids = await this.restrictionModel
        .distinct("userId", { active: true, $or: [{ until: null }, { until: { $gt: now } }] })
        .exec();

      return ids.length;
    } catch (error) {
      this.logger.warn(`Could not count restricted accounts: ${String(error)}`);
      return 0;
    }
  }
}
