import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model, Types } from "mongoose";

import { LoginEvent, LoginEventDocument } from "../login-event.schema";

export interface LoginHistoryItem {
  id: string;
  at: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet" | "unknown";
  current: boolean;
}

export interface LoginHistoryView {
  items: LoginHistoryItem[];
  lastSuccessfulAt: string | null;
  failedLast30Days: number;
  retentionDays: number;
}

const MAX_ITEMS = 100;

/** Very small user-agent reader: enough to say "Chrome on Windows". */
export function describeUserAgent(ua?: string | null): { browser: string; os: string; device: LoginHistoryItem["device"] } {
  const s = String(ua || "");
  if (!s) return { browser: "Unknown browser", os: "Unknown device", device: "unknown" };
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /SamsungBrowser/.test(s)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(s)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(s)
            ? "Chrome"
            : /Safari\//.test(s)
              ? "Safari"
              : /okhttp|Dart|Expo|CFNetwork/i.test(s)
                ? "Fockis app"
                : "Other browser";
  const os = /Windows/.test(s)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(s)
      ? "iOS"
      : /Android/.test(s)
        ? "Android"
        : /Mac OS X|Macintosh/.test(s)
          ? "macOS"
          : /CrOS/.test(s)
            ? "ChromeOS"
            : /Linux/.test(s)
              ? "Linux"
              : "Unknown device";
  const device: LoginHistoryItem["device"] = /iPad|Tablet/.test(s) ? "tablet" : /Mobi|iPhone|Android/.test(s) ? "mobile" : "desktop";
  return { browser, os, device };
}

@Injectable()
export class LoginHistoryService {
  private readonly logger = new Logger(LoginHistoryService.name);

  constructor(@InjectModel(LoginEvent.name) private readonly model: Model<LoginEventDocument>) {}

  /** Never throws: a history write must not block or break a sign-in. */
  async record(userId: string, entry: { success: boolean; reason?: string | null; ip?: string | null; userAgent?: string | null }): Promise<void> {
    if (!isValidObjectId(userId)) return;
    try {
      await this.model.create({
        userId: new Types.ObjectId(userId),
        at: new Date(),
        success: entry.success,
        reason: entry.success ? null : (entry.reason ?? "wrong_password"),
        ip: entry.ip ? String(entry.ip).slice(0, 64) : null,
        userAgent: entry.userAgent ? String(entry.userAgent).slice(0, 512) : null,
      });
    } catch (err) {
      this.logger.warn(`Could not record login event: ${(err as Error).message}`);
    }
  }

  async list(userId: string, current?: { ip?: string | null; userAgent?: string | null }): Promise<LoginHistoryView> {
    if (!isValidObjectId(userId)) throw new BadRequestException("Invalid user ID.");
    const uid = new Types.ObjectId(userId);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [rows, failed] = await Promise.all([
      this.model.find({ userId: uid }).sort({ at: -1 }).limit(MAX_ITEMS).lean<any[]>().exec(),
      this.model.countDocuments({ userId: uid, success: false, at: { $gte: since } }).exec(),
    ]);
    let currentMarked = false;
    const items = rows.map((r) => {
      const isCurrent =
        !currentMarked && r.success && Boolean(current?.userAgent) && r.userAgent === current?.userAgent && (!current?.ip || r.ip === current.ip);
      if (isCurrent) currentMarked = true;
      return {
        id: String(r._id),
        at: new Date(r.at).toISOString(),
        success: Boolean(r.success),
        reason: r.reason ?? null,
        ip: r.ip ?? null,
        ...describeUserAgent(r.userAgent),
        current: isCurrent,
      };
    });
    const lastOk = rows.find((r) => r.success);
    return { items, lastSuccessfulAt: lastOk ? new Date(lastOk.at).toISOString() : null, failedLast30Days: failed, retentionDays: 180 };
  }
}
