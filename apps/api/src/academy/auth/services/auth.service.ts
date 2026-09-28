import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

import {
  AcademyUser,
  AcademyUserDocument,
  AcademyRole,
} from "../schemas/academy-user.schema";

import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AcademyUser.name)
    private readonly userModel: Model<AcademyUser>,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.ACADEMY_JWT_SECRET;

    if (!secret) {
      throw new Error(
        "ACADEMY_JWT_SECRET is not configured.",
      );
    }

    return secret;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userModel
      .findOne({ email })
      .exec();

    if (existing) {
      throw new ConflictException(
        "An account with that email already exists.",
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      12,
    );

    const studentSlug =
      await this.generateStudentSlug(dto.name);

    const user = await this.userModel.create({
      email,
      passwordHash,
      name: dto.name.trim(),
      role: "student",
      studentSlug,
      isActive: true,
      twoFactorEnabled: false,
      sessions: [],
      loginHistory: [],
      securityEvents: [],
    });

    return this.signToken(user);
  }

  private async generateStudentSlug(
    name: string,
  ): Promise<string> {
    const baseSlug =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      "student";

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.userModel.exists({
        studentSlug: slug,
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async bootstrapAdmin(body: {
    email: string;
    password: string;
    name: string;
    bootstrapSecret: string;
  }) {
    const configuredSecret =
      process.env.ACADEMY_BOOTSTRAP_SECRET;

    if (!configuredSecret) {
      throw new ForbiddenException(
        "Academy administrator bootstrap is not configured.",
      );
    }

    if (
      !body.bootstrapSecret ||
      body.bootstrapSecret !== configuredSecret
    ) {
      throw new UnauthorizedException(
        "Invalid Academy bootstrap secret.",
      );
    }

    const existingAdministrator =
      await this.userModel
        .findOne({
          role: "administrator",
        })
        .exec();

    if (existingAdministrator) {
      throw new ConflictException(
        "An Academy administrator already exists.",
      );
    }

    const email = body.email.trim().toLowerCase();

    const existingUser =
      await this.userModel
        .findOne({ email })
        .exec();

    if (existingUser) {
      throw new ConflictException(
        "An account with that email already exists.",
      );
    }

    const passwordHash = await bcrypt.hash(
      body.password,
      12,
    );

    const user = await this.userModel.create({
      email,
      passwordHash,
      name: body.name.trim(),
      role: "administrator",
      isActive: true,
      twoFactorEnabled: false,
      sessions: [],
      loginHistory: [],
      securityEvents: [],
    });

    return {
      message:
        "Academy administrator created successfully.",
      ...this.signToken(user),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.userModel
      .findOne({ email })
      .select("+passwordHash +twoFactorSecret")
      .exec();

    if (!user) {
      throw new UnauthorizedException(
        "Invalid email or password.",
      );
    }

    const valid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!valid) {
      await this.recordLoginHistory(
        user,
        false,
      );

      throw new UnauthorizedException(
        "Invalid email or password.",
      );
    }

    if (!user.isActive) {
      await this.recordLoginHistory(
        user,
        false,
      );

      throw new ForbiddenException(
        "This Academy account is disabled.",
      );
    }

    return this.signToken(user);
  }

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return this.toSafeUser(user);
  }

  async updateMe(
    userId: string,
    body: {
      name?: string;
      email?: string;
    },
  ) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "This Academy account is disabled.",
      );
    }

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        throw new ConflictException(
          "Name cannot be empty.",
        );
      }

      user.name = name;

      if (user.role === "student") {
        user.studentSlug =
          await this.generateStudentSlug(
            name,
          );
      }
    }

    if (body.email !== undefined) {
      const email =
        body.email.trim().toLowerCase();

      if (!email) {
        throw new ConflictException(
          "Email cannot be empty.",
        );
      }

      const existing =
        await this.userModel.findOne({
          email,
          _id: { $ne: user._id },
        }).exec();

      if (existing) {
        throw new ConflictException(
          "An account with that email already exists.",
        );
      }

      user.email = email;
    }

    await user.save();

    return this.toSafeUser(user);
  }

  async disableAccount(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    user.isActive = false;
    user.sessions = [];

    user.securityEvents.unshift({
      id: randomUUID(),
      type: "account_disabled",
      description:
        "Academy account was disabled.",
      createdAt: new Date(),
    });

    await user.save();

    return {
      message:
        "Academy account disabled successfully.",
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select("+passwordHash")
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "This Academy account is disabled.",
      );
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException(
        "Current password is incorrect.",
      );
    }

    if (!newPassword || newPassword.length < 8) {
      throw new ConflictException(
        "New password must be at least 8 characters.",
      );
    }

    user.passwordHash =
      await bcrypt.hash(
        newPassword,
        12,
      );

    user.sessions = [];

    user.securityEvents.unshift({
      id: randomUUID(),
      type: "password_changed",
      description:
        "Academy account password was changed.",
      createdAt: new Date(),
    });

    await user.save();

    return {
      message:
        "Password changed successfully. All sessions have been signed out.",
    };
  }

  async getSessions(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return user.sessions || [];
  }

  async signOutAllSessions(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    user.sessions = [];

    user.securityEvents.unshift({
      id: randomUUID(),
      type: "sessions_revoked",
      description:
        "All Academy sessions were signed out.",
      createdAt: new Date(),
    });

    await user.save();

    return {
      message:
        "All Academy sessions have been signed out.",
    };
  }

  async getTwoFactorStatus(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("+twoFactorSecret")
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return {
      enabled: Boolean(
        user.twoFactorEnabled,
      ),
    };
  }

  async enableTwoFactor(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("+twoFactorSecret")
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "This Academy account is disabled.",
      );
    }

    if (user.twoFactorEnabled) {
      return {
        enabled: true,
        message:
          "Two-factor authentication is already enabled.",
      };
    }

    user.twoFactorSecret =
      randomUUID().replace(/-/g, "");

    user.twoFactorEnabled = true;

    user.securityEvents.unshift({
      id: randomUUID(),
      type: "two_factor_enabled",
      description:
        "Two-factor authentication was enabled.",
      createdAt: new Date(),
    });

    await user.save();

    return {
      enabled: true,
      message:
        "Two-factor authentication enabled.",
    };
  }

  async disableTwoFactor(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("+twoFactorSecret")
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;

    user.securityEvents.unshift({
      id: randomUUID(),
      type: "two_factor_disabled",
      description:
        "Two-factor authentication was disabled.",
      createdAt: new Date(),
    });

    await user.save();

    return {
      enabled: false,
      message:
        "Two-factor authentication disabled.",
    };
  }

  async getLoginHistory(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return user.loginHistory || [];
  }

  async getSecurityEvents(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    return user.securityEvents || [];
  }

  async findAll() {
    const users = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .exec();

    return users.map((user) =>
      this.toSafeUser(user),
    );
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
  ) {
    const user = await this.userModel
      .findById(id)
      .exec();

    if (!user) {
      throw new NotFoundException(
        "Academy user not found.",
      );
    }

    user.role = dto.role;

    if (dto.role === "student") {
      if (!user.studentSlug) {
        user.studentSlug =
          await this.generateStudentSlug(
            user.name,
          );
      }
    } else {
      user.studentSlug = undefined;
    }

    await user.save();

    return this.toSafeUser(user);
  }

  private async recordLoginHistory(
    user: AcademyUserDocument,
    success: boolean,
  ) {
    user.loginHistory.unshift({
      id: randomUUID(),
      email: user.email,
      success,
      createdAt: new Date(),
    });

    user.loginHistory =
      user.loginHistory.slice(0, 50);

    await user.save();
  }

  private toSafeUser(
    user: AcademyUserDocument,
  ) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      studentSlug: user.studentSlug,
      isActive: user.isActive,
      twoFactorEnabled:
        user.twoFactorEnabled,
    };
  }

  private async signToken(
    user: AcademyUserDocument,
  ) {
    const userId =
      user._id.toString();

    const sessionId = randomUUID();

    user.sessions.unshift({
      id: sessionId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      current: true,
    });

    user.sessions =
      user.sessions.slice(0, 20);

    user.loginHistory.unshift({
      id: randomUUID(),
      email: user.email,
      success: true,
      createdAt: new Date(),
    });

    user.loginHistory =
      user.loginHistory.slice(0, 50);

    await user.save();

    const payload = {
      sub: userId,
      userId,
      email: user.email,
      role: user.role,
      authType: "academy",
      sessionId,
    };

    const accessToken =
      this.jwtService.sign(
        payload,
        {
          secret: this.getJwtSecret(),
          expiresIn: "7d",
        },
      );

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
  }
}