
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { connect, type ClientHttp2Session } from "http2";
import { JWT } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import { Model, Types } from "mongoose";

import { UserDevice, UserDeviceDocument } from "./call.schemas";

/* ============================================================================
   CALL PUSH DELIVERY

   Android: Firebase Cloud Messaging HTTP v1, high-priority DATA messages.
   iOS: APNs VoIP pushes (PushKit).

   Configuration:
   FIREBASE_SERVICE_ACCOUNT_JSON
   FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY
   APNS_KEY_ID
   APNS_TEAM_ID
   APNS_PRIVATE_KEY
   APNS_BUNDLE_ID
   APNS_PRODUCTION
============================================================================ */

type DevicePlatform = "android" | "ios" | "web";

export interface IncomingCallPush {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  type: "voice" | "video";
  expiresAt: string;
  actionToken: string;
}

interface DeviceWithTokens {
  _id: Types.ObjectId;
  deviceId: string;
  platform: DevicePlatform;
  pushToken?: string;
  voipToken?: string;
}

@Injectable()
export class CallPushService {
  private readonly logger = new Logger(CallPushService.name);

  private fcmClient: JWT | null | undefined;
  private fcmProject = "";

  private apnsJwt: { token: string; at: number } | null = null;
  private apnsSession: ClientHttp2Session | null = null;

  private warned = new Set<string>();

  constructor(
    @InjectModel(UserDevice.name)
    private readonly devices: Model<UserDeviceDocument>,
  ) {}

  /* ---------------- configuration ---------------- */

  private fcm(): JWT | null {
    if (this.fcmClient !== undefined) {
      return this.fcmClient;
    }

    try {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      const parsed = json ? JSON.parse(json) : null;

      const email =
        parsed?.client_email ??
        process.env.FIREBASE_CLIENT_EMAIL?.trim();

      const key = (
        parsed?.private_key ??
        process.env.FIREBASE_PRIVATE_KEY ??
        ""
      ).replace(/\\n/g, "\n");

      this.fcmProject =
        parsed?.project_id ??
        process.env.FIREBASE_PROJECT_ID?.trim() ??
        "";

      this.fcmClient =
        email && key && this.fcmProject
          ? new JWT({
              email,
              key,
              scopes: [
                "https://www.googleapis.com/auth/firebase.messaging",
              ],
            })
          : null;
    } catch (error) {
      this.logger.error(
        `Firebase credentials could not be read: ${String(error)}`,
      );

      this.fcmClient = null;
    }

    return this.fcmClient;
  }

  private apnsConfig() {
    const keyId = process.env.APNS_KEY_ID?.trim();
    const teamId = process.env.APNS_TEAM_ID?.trim();

    const key = (
      process.env.APNS_PRIVATE_KEY ?? ""
    ).replace(/\\n/g, "\n").trim();

    if (!keyId || !teamId || !key) {
      return null;
    }

    return {
      keyId,
      teamId,
      key,
      topic: `${
        process.env.APNS_BUNDLE_ID?.trim() || "com.fockis.mobile"
      }.voip`,
      host:
        process.env.APNS_PRODUCTION === "true"
          ? "https://api.push.apple.com"
          : "https://api.sandbox.push.apple.com",
    };
  }

  private warnOnce(key: string, message: string) {
    if (this.warned.has(key)) {
      return;
    }

    this.warned.add(key);
    this.logger.warn(message);
  }

  /**
   * Which push channels are configured.
   * Never exposes credentials.
   */
  status() {
    return {
      android: Boolean(this.fcm()),
      ios: Boolean(this.apnsConfig()),
    };
  }

  /* ---------------- devices ---------------- */

  /**
   * Returns active devices belonging to a user.
   *
   * IMPORTANT:
   * DevicePlatform prevents Mongoose's $in query from receiving
   * an unrestricted string[].
   */
  private async activeDevices(
    userId: string,
    platforms: readonly DevicePlatform[],
  ): Promise<DeviceWithTokens[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const devices = await this.devices
      .find({
        userId: new Types.ObjectId(userId),
        platform: { $in: [...platforms] },
        disabledAt: null,
      })
      .select("+pushToken +voipToken deviceId platform")
      .lean()
      .exec();

    return devices as unknown as DeviceWithTokens[];
  }

  private async disable(
    device: DeviceWithTokens,
    reason: string,
  ) {
    await this.devices
      .updateOne(
        { _id: device._id },
        { $set: { disabledAt: new Date() } },
      )
      .exec();

    this.logger.log(
      `Push token for device ${device.deviceId} disabled (${reason}).`,
    );
  }

  /* ---------------- public API ---------------- */

  /**
   * Rings every phone of the receiver that hasn't been notified
   * for this call yet.
   *
   * Returns device IDs that received a push.
   */
  async sendIncomingCall(
    receiverId: string,
    call: IncomingCallPush,
    alreadyNotified: string[],
  ): Promise<string[]> {
    const devices = (
      await this.activeDevices(receiverId, ["android", "ios"])
    ).filter(
      (device) => !alreadyNotified.includes(device.deviceId),
    );

    const sent: string[] = [];

    await Promise.all(
      devices.map(async (device) => {
        const ok =
          device.platform === "ios" && device.voipToken
            ? await this.sendVoip(device, call)
            : device.platform === "android" && device.pushToken
              ? await this.sendFcm(
                  device,
                  {
                    kind: "incoming_call",
                    ...call,
                  },
                  call.expiresAt,
                )
              : false;

        if (ok) {
          sent.push(device.deviceId);
        }
      }),
    );

    return sent;
  }

  /**
   * Stops ringing on Android phones.
   */
  async sendCallEnded(
    userId: string,
    callId: string,
    reason: string,
    exceptDeviceId = "",
  ) {
    const devices = (
      await this.activeDevices(userId, ["android"])
    ).filter(
      (device) =>
        device.deviceId !== exceptDeviceId &&
        Boolean(device.pushToken),
    );

    await Promise.all(
      devices.map((device) =>
        this.sendFcm(
          device,
          {
            kind: "call_ended",
            callId,
            reason,
          },
          new Date(Date.now() + 60_000).toISOString(),
        ),
      ),
    );
  }

  /**
   * Sends a missed-call notification to Android devices.
   */
  async sendMissedCall(
    userId: string,
    call: Omit<
      IncomingCallPush,
      "expiresAt" | "actionToken"
    >,
  ) {
    const devices = (
      await this.activeDevices(userId, ["android"])
    ).filter((device) => Boolean(device.pushToken));

    await Promise.all(
      devices.map((device) =>
        this.sendFcm(
          device,
          {
            kind: "missed_call",
            ...call,
          },
          new Date(Date.now() + 24 * 3600_000).toISOString(),
        ),
      ),
    );
  }

  /* ---------------- FCM ---------------- */

  private async sendFcm(
    device: DeviceWithTokens,
    data: Record<string, string>,
    expiresAt: string,
  ): Promise<boolean> {
    const client = this.fcm();

    if (!client) {
      this.warnOnce(
        "fcm",
        "FCM is not configured (FIREBASE_*); Android phones won't ring in the background.",
      );

      return false;
    }

    const ttl = Math.max(
      1,
      Math.round(
        (new Date(expiresAt).getTime() - Date.now()) / 1000,
      ),
    );

    try {
      const res = await client.request<{ name?: string }>({
        url: `https://fcm.googleapis.com/v1/projects/${this.fcmProject}/messages:send`,
        method: "POST",
        data: {
          message: {
            token: device.pushToken,
            data,
            android: {
              priority: "HIGH",
              ttl: `${ttl}s`,
              direct_boot_ok: true,
            },
          },
        },
        validateStatus: () => true,
      } as any);

      if (res.status >= 200 && res.status < 300) {
        return true;
      }

      const body = JSON.stringify(res.data ?? {});

      if (
        res.status === 404 ||
        /UNREGISTERED|INVALID_ARGUMENT.*token/i.test(body)
      ) {
        await this.disable(
          device,
          "FCM token no longer valid",
        );
      } else {
        this.logger.warn(
          `FCM push failed (${res.status}): ${body.slice(0, 300)}`,
        );
      }

      return false;
    } catch (error) {
      this.logger.warn(`FCM push error: ${String(error)}`);
      return false;
    }
  }

  /* ---------------- APNs VoIP ---------------- */

  private apnsToken(
    cfg: NonNullable<
      ReturnType<CallPushService["apnsConfig"]>
    >,
  ) {
    // Apple accepts a provider token for up to one hour.
    // Refresh after 50 minutes.

    if (
      this.apnsJwt &&
      Date.now() - this.apnsJwt.at < 50 * 60_000
    ) {
      return this.apnsJwt.token;
    }

    const token = jwt.sign(
      {
        iss: cfg.teamId,
        iat: Math.floor(Date.now() / 1000),
      },
      cfg.key,
      {
        algorithm: "ES256",
        keyid: cfg.keyId,
      },
    );

    this.apnsJwt = {
      token,
      at: Date.now(),
    };

    return token;
  }

  private session(host: string) {
    if (
      this.apnsSession &&
      !this.apnsSession.closed &&
      !this.apnsSession.destroyed
    ) {
      return this.apnsSession;
    }

    this.apnsSession = connect(host);

    this.apnsSession.on("error", (error) => {
      this.logger.warn(
        `APNs connection error: ${String(error)}`,
      );
    });

    this.apnsSession.on("goaway", () => {
      this.apnsSession?.close();
    });

    this.apnsSession.unref();

    return this.apnsSession;
  }

  private async sendVoip(
    device: DeviceWithTokens,
    call: IncomingCallPush,
  ): Promise<boolean> {
    const cfg = this.apnsConfig();

    if (!cfg) {
      this.warnOnce(
        "apns",
        "APNs is not configured (APNS_*); iPhones won't ring in the background.",
      );

      return false;
    }

    let authorization: string;

    try {
      authorization = `bearer ${this.apnsToken(cfg)}`;
    } catch (error) {
      this.warnOnce(
        "apns-key",
        `APNs key could not be used: ${String(error)}`,
      );

      return false;
    }

    const body = JSON.stringify({
      aps: {},
      ...call,
    });

    return new Promise<boolean>((resolve) => {
      try {
        const req = this.session(cfg.host).request({
          ":method": "POST",
          ":path": `/3/device/${device.voipToken}`,
          authorization,
          "apns-topic": cfg.topic,
          "apns-push-type": "voip",
          "apns-priority": "10",
          "apns-expiration": String(
            Math.floor(
              new Date(call.expiresAt).getTime() / 1000,
            ),
          ),
          "apns-collapse-id": call.callId.slice(0, 64),
          "content-type": "application/json",
        });

        let status = 0;
        let responseText = "";

        req.setTimeout(10_000, () => {
          req.close();
          resolve(false);
        });

        req.on("response", (headers) => {
          status = Number(headers[":status"] ?? 0);
        });

        req.on("data", (chunk) => {
          responseText += chunk;
        });

        req.on("end", () => {
          if (status === 200) {
            return resolve(true);
          }

          if (
            status === 410 ||
            /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(
              responseText,
            )
          ) {
            void this.disable(
              device,
              `APNs ${status} ${responseText}`,
            );
          } else {
            this.logger.warn(
              `APNs VoIP push failed (${status}): ${responseText.slice(0, 200)}`,
            );
          }

          resolve(false);
        });

        req.on("error", (error) => {
          this.logger.warn(
            `APNs request error: ${String(error)}`,
          );

          resolve(false);
        });

        req.end(body);
      } catch (error) {
        this.logger.warn(
          `APNs push error: ${String(error)}`,
        );

        resolve(false);
      }
    });
  }
}
