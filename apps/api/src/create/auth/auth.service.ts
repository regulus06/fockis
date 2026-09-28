import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User, UserDocument, UserRole } from './schemas/user.schema';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly jwtService: JwtService,

    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // TOKEN GENERATION
  // ---------------------------------------------------------------------------

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    // Use numeric seconds here.
    // This avoids the StringValue typing problem in newer @nestjs/jwt versions.
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: 900, // 15 minutes
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: 604800, // 7 days
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // ---------------------------------------------------------------------------
  // REGISTER
  // ---------------------------------------------------------------------------

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.userModel
      .findOne({ email })
      .lean();

    if (existing) {
      throw new ConflictException(
        'An account with this email already exists',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      12,
    );

    const user = await this.userModel.create({
      email,
      passwordHash,
      name: dto.name,
      role: UserRole.USER,
    });

    const tokens = await this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userModel.findOne({
      email,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const matches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!matches) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const tokens = await this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN
  // ---------------------------------------------------------------------------

  async refresh(refreshToken: string) {
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured',
      );
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    const user = await this.userModel.findById(
      payload.sub,
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'User not found or inactive',
      );
    }

    const tokens = await this.issueTokens(user);

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // CURRENT USER
  // ---------------------------------------------------------------------------

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .lean();

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toPublicUser(user);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC USER
  // ---------------------------------------------------------------------------

  private toPublicUser(user: UserDocument | any) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}