import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model, isValidObjectId } from "mongoose";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

import { User, UserDocument } from "../user.schema";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class EmailChangeService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  private getMailer() {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = Number(this.configService.get("SMTP_PORT") || 465);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    const from = this.configService.get<string>("MAIL_FROM");

    if (!host || !user || !pass || !from || !Number.isFinite(port)) {
      throw new ServiceUnavailableException(
        "Email delivery is not configured.",
      );
    }

    return {
      from,
      transporter: nodemailer.createTransport({
        host,
        port,
        secure:
          String(this.configService.get("SMTP_SECURE") ?? "true")
            .toLowerCase() === "true",
        auth: { user, pass },
      }),
    };
  }

  async requestChange(
    userId: string,
    newEmailInput: string,
    currentPassword: string,
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException("Invalid user ID.");
    }

    const newEmail = String(newEmailInput || "").trim().toLowerCase();

    if (
      !newEmail ||
      newEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
    ) {
      throw new BadRequestException("Enter a valid email address.");
    }

    if (!currentPassword) {
      throw new BadRequestException("Current password is required.");
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException("Current password is incorrect.");
    }

    if (newEmail === String(user.email).toLowerCase()) {
      throw new BadRequestException(
        "The new email must differ from your current email.",
      );
    }

    const existing = await this.userModel.exists({ email: newEmail });

    if (existing) {
      throw new BadRequestException(
        "That email address is already in use.",
      );
    }

    const now = Date.now();
    const lastRequested = (user as any).emailChangeLastRequestedAt;

    if (
      lastRequested &&
      now - new Date(lastRequested).getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        "Please wait before requesting another verification code.",
      );
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    (user as any).pendingEmail = newEmail;
    (user as any).emailChangeCodeHash = codeHash;
    (user as any).emailChangeExpiresAt = new Date(now + CODE_TTL_MS);
    (user as any).emailChangeLastRequestedAt = new Date(now);
    (user as any).emailChangeAttempts = 0;

    await user.save();

    try {
      const { transporter, from } = this.getMailer();

      await transporter.sendMail({
        from,
        to: newEmail,
        subject: "Verify your new Fockis email address",
        text:
          `Your Fockis email verification code is ${code}.\n\n` +
          "This code expires in 10 minutes. If you did not request this change, " +
          "you can ignore this message.",
        html:
          `<p>You requested to change your Fockis email address.</p>` +
          `<p>Your verification code is <strong>${code}</strong>.</p>` +
          `<p>This code expires in 10 minutes.</p>` +
          `<p>If you did not request this change, you can ignore this message.</p>`,
      });
    } catch {
      (user as any).pendingEmail = null;
      (user as any).emailChangeCodeHash = null;
      (user as any).emailChangeExpiresAt = null;
      (user as any).emailChangeAttempts = 0;

      await user.save().catch(() => undefined);

      throw new ServiceUnavailableException(
        "We could not send the verification email. Please try again later.",
      );
    }

    return {
      success: true,
      message: "A verification code was sent to your new email address.",
      expiresInSeconds: CODE_TTL_MS / 1000,
    };
  }

  async verifyChange(userId: string, suppliedCode: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException("Invalid user ID.");
    }

    if (!/^\d{6}$/.test(String(suppliedCode || ""))) {
      throw new BadRequestException("Enter the six-digit verification code.");
    }

    // Explicitly load the hash because the schema marks it select: false.
    const user = await this.userModel
      .findById(userId)
      .select("+emailChangeCodeHash");

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const pendingEmail = (user as any).pendingEmail as string | null;
    const storedHash = (user as any).emailChangeCodeHash as string | null;
    const expiresAt = (user as any).emailChangeExpiresAt as Date | null;
    const attempts = Number((user as any).emailChangeAttempts || 0);

    if (!pendingEmail || !storedHash || !expiresAt) {
      throw new BadRequestException(
        "There is no pending email change. Request a new code.",
      );
    }

    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException(
        "Too many incorrect attempts. Request a new verification code.",
      );
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      (user as any).pendingEmail = null;
      (user as any).emailChangeCodeHash = null;
      (user as any).emailChangeExpiresAt = null;
      (user as any).emailChangeAttempts = 0;

      await user.save();

      throw new BadRequestException(
        "The verification code has expired. Request a new one.",
      );
    }

    const suppliedHash = crypto
      .createHash("sha256")
      .update(suppliedCode)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(storedHash, "hex"),
        Buffer.from(suppliedHash, "hex"),
      )
    ) {
      (user as any).emailChangeAttempts = attempts + 1;
      await user.save();

      throw new BadRequestException("The verification code is incorrect.");
    }

    const duplicate = await this.userModel.exists({
      email: pendingEmail,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      (user as any).pendingEmail = null;
      (user as any).emailChangeCodeHash = null;
      (user as any).emailChangeExpiresAt = null;
      (user as any).emailChangeAttempts = 0;

      await user.save();

      throw new BadRequestException(
        "That email address is already in use. Request a new code.",
      );
    }

    const oldEmail = user.email;
    user.email = pendingEmail;

    (user as any).pendingEmail = null;
    (user as any).emailChangeCodeHash = null;
    (user as any).emailChangeExpiresAt = null;
    (user as any).emailChangeLastRequestedAt = null;
    (user as any).emailChangeAttempts = 0;

    try {
      await user.save();
    } catch {
      throw new InternalServerErrorException(
        "The email address could not be updated. Please try again.",
      );
    }

    return {
      success: true,
      message: "Your email address has been updated.",
      email: user.email,
      previousEmail: oldEmail,
    };
  }
}