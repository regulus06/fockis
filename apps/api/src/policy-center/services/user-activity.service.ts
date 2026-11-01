import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { UserPolicyActivity, UserPolicyActivityDocument } from "../schemas/policy.schemas";

/** The "Recent Activity" list on the user's Policy Center. Users only ever read their own. */
@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);

  constructor(@InjectModel(UserPolicyActivity.name) private readonly activity: Model<UserPolicyActivityDocument>) {}

  async add(userId: string, type: string, title: string, description = "") {
    try {
      await this.activity.create({ userId, type, title, description: description.slice(0, 300), at: new Date() });
    } catch (error) {
      this.logger.warn(`Activity write failed: ${String(error)}`);
    }
  }

  async list(userId: string, limit = 10) {
    const rows = await this.activity.find({ userId }).sort({ at: -1 }).limit(Math.min(50, limit)).lean().exec();
    return rows.map((r) => ({ id: String(r._id), type: r.type, title: r.title, description: r.description, at: r.at }));
  }

  /** Removed with the account (called by data deletion). */
  async purge(userId: string) {
    await this.activity.deleteMany({ userId }).exec();
  }
}
