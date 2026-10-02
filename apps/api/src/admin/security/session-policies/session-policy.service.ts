import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSessionPolicyDto } from './dto/create-session-policy.dto';
import { UpdateSessionPolicyDto } from './dto/update-session-policy.dto';
import {
  SessionPolicy,
  SessionPolicyDocument,
} from './session-policy.schema';

export interface ResolvedSessionPolicy {
  key: string;
  displayName: string;
  inactivityMinutes: number;
  maximumSessionHours: number;
  requireMfa: boolean;
}

interface ActorLike {
  _id?: unknown;
  id?: unknown;
  userId?: unknown;
}

@Injectable()
export class SessionPolicyService implements OnModuleInit {
  private readonly cache = new Map<string, ResolvedSessionPolicy>();
  private cacheExpiresAt = 0;
  private readonly cacheTtlMs = 30_000;

  constructor(
    @InjectModel(SessionPolicy.name)
    private readonly policyModel: Model<SessionPolicyDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultPolicies();
    await this.refreshCache();
  }

  private actorId(actor?: ActorLike): Types.ObjectId | null {
    const raw = actor?._id ?? actor?.id ?? actor?.userId;
    if (!raw) return null;
    if (raw instanceof Types.ObjectId) return raw;
    return Types.ObjectId.isValid(String(raw))
      ? new Types.ObjectId(String(raw))
      : null;
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private async refreshCache(): Promise<void> {
    const policies = await this.policyModel
      .find({ enabled: true })
      .sort({ priority: -1 })
      .lean()
      .exec();

    this.cache.clear();

    for (const policy of policies) {
      const normalized = this.toResolved(policy);
      this.cache.set(normalized.key, normalized);
    }

    this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
  }

  private async ensureCache(): Promise<void> {
    if (Date.now() >= this.cacheExpiresAt) {
      await this.refreshCache();
    }
  }

  private toResolved(policy: Partial<SessionPolicy>): ResolvedSessionPolicy {
    return {
      key: String(policy.key),
      displayName: String(policy.displayName),
      inactivityMinutes: Number(policy.inactivityMinutes),
      maximumSessionHours: Number(policy.maximumSessionHours),
      requireMfa: Boolean(policy.requireMfa),
    };
  }

  async list() {
    return this.policyModel.find().sort({ priority: -1, displayName: 1 }).lean().exec();
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session policy ID');
    }

    const policy = await this.policyModel.findById(id).lean().exec();

    if (!policy) {
      throw new NotFoundException('Session policy not found');
    }

    return policy;
  }

  async create(dto: CreateSessionPolicyDto, actor?: ActorLike) {
    const key = this.normalizeKey(dto.key);

    const existing = await this.policyModel.findOne({ key }).lean().exec();
    if (existing) {
      throw new ConflictException(`Session policy "${key}" already exists`);
    }

    if (dto.isDefault) {
      await this.policyModel.updateMany({}, { $set: { isDefault: false } }).exec();
    }

    const policy = await this.policyModel.create({
      ...dto,
      key,
      routePatterns: dto.routePatterns ?? [],
      enabled: dto.enabled ?? true,
      requireMfa: dto.requireMfa ?? false,
      priority: dto.priority ?? 100,
      isDefault: dto.isDefault ?? false,
      isProtected: false,
      createdBy: this.actorId(actor),
      updatedBy: this.actorId(actor),
    });

    await this.refreshCache();
    return policy.toObject();
  }

  async update(id: string, dto: UpdateSessionPolicyDto, actor?: ActorLike) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session policy ID');
    }

    const policy = await this.policyModel.findById(id);
    if (!policy) {
      throw new NotFoundException('Session policy not found');
    }

    if (dto.key && this.normalizeKey(dto.key) !== policy.key) {
      const newKey = this.normalizeKey(dto.key);
      const duplicate = await this.policyModel.findOne({
        key: newKey,
        _id: { $ne: policy._id },
      }).lean().exec();

      if (duplicate) {
        throw new ConflictException(`Session policy "${newKey}" already exists`);
      }

      policy.key = newKey;
    }

    if (dto.isDefault === true) {
      await this.policyModel.updateMany(
        { _id: { $ne: policy._id } },
        { $set: { isDefault: false } },
      ).exec();
    }

    Object.assign(policy, {
      ...dto,
      key: policy.key,
      updatedBy: this.actorId(actor),
    });

    await policy.save();
    await this.refreshCache();

    return policy.toObject();
  }

  async remove(id: string, actor?: ActorLike) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session policy ID');
    }

    const policy = await this.policyModel.findById(id);
    if (!policy) {
      throw new NotFoundException('Session policy not found');
    }

    if (policy.isProtected) {
      throw new BadRequestException('Protected session policies cannot be deleted');
    }

    if (policy.isDefault) {
      throw new BadRequestException('The default session policy cannot be deleted');
    }

    await this.policyModel.deleteOne({ _id: policy._id }).exec();
    await this.refreshCache();

    return {
      success: true,
      deletedPolicyId: String(policy._id),
      deletedBy: this.actorId(actor)?.toString() ?? null,
    };
  }

  async resolveForRequest(path: string): Promise<ResolvedSessionPolicy> {
    await this.ensureCache();

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    const policies = await this.policyModel
      .find({ enabled: true })
      .sort({ priority: -1 })
      .lean()
      .exec();

    for (const policy of policies) {
      if (policy.isDefault) continue;

      const patterns = policy.routePatterns ?? [];
      if (patterns.some((pattern) => this.matchesPattern(normalizedPath, pattern))) {
        return this.toResolved(policy);
      }
    }

    const defaultPolicy = policies.find((policy) => policy.isDefault);
    if (defaultPolicy) {
      return this.toResolved(defaultPolicy);
    }

    return {
      key: 'default',
      displayName: 'Default',
      inactivityMinutes: 120,
      maximumSessionHours: 24,
      requireMfa: false,
    };
  }

  private matchesPattern(path: string, pattern: string): boolean {
    const normalizedPattern = pattern.trim();
    if (!normalizedPattern) return false;

    if (normalizedPattern.endsWith('/**')) {
      return path.startsWith(normalizedPattern.slice(0, -3));
    }

    if (normalizedPattern.endsWith('*')) {
      return path.startsWith(normalizedPattern.slice(0, -1));
    }

    return path === normalizedPattern;
  }

  async getDefaults() {
    return [
      {
        key: 'social',
        displayName: 'Social',
        description: 'Feed, posts, stories, profiles and normal social activity.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/feed/**', '/profile/**', '/stories/**', '/posts/**'],
        priority: 100,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'shop',
        displayName: 'Shop',
        description: 'Fockis Shop and normal shopping sessions.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/shop/**'],
        priority: 100,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'marketplace',
        displayName: 'Marketplace',
        description: 'Marketplace browsing and seller activity.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/marketplace/**'],
        priority: 110,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'real-estate',
        displayName: 'Real Estate',
        description: 'Real estate activity.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/realestate/**'],
        priority: 100,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'travel',
        displayName: 'Travel',
        description: 'Travel activity.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/travel/**'],
        priority: 100,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'music',
        displayName: 'Music',
        description: 'Music and playlist activity.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: ['/music/**', '/playlists/**'],
        priority: 100,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'organizations',
        displayName: 'Organizations',
        description: 'Organization management and administration.',
        inactivityMinutes: 15,
        maximumSessionHours: 12,
        requireMfa: true,
        routePatterns: ['/organizations/**'],
        priority: 200,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'academy',
        displayName: 'Academy',
        description: 'Fockis Academy sessions.',
        inactivityMinutes: 15,
        maximumSessionHours: 12,
        requireMfa: true,
        routePatterns: ['/academy/**'],
        priority: 200,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'careers',
        displayName: 'Careers',
        description: 'Career and recruiter management areas.',
        inactivityMinutes: 15,
        maximumSessionHours: 12,
        requireMfa: true,
        routePatterns: ['/careers/**'],
        priority: 200,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'admin',
        displayName: 'Admin',
        description: 'Fockis administrator center.',
        inactivityMinutes: 10,
        maximumSessionHours: 8,
        requireMfa: true,
        routePatterns: ['/admin/**'],
        priority: 500,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'super-admin',
        displayName: 'Super Admin',
        description: 'Highest-security administrative session.',
        inactivityMinutes: 5,
        maximumSessionHours: 4,
        requireMfa: true,
        routePatterns: ['/admin/super/**'],
        priority: 600,
        isDefault: false,
        isProtected: true,
      },
      {
        key: 'default',
        displayName: 'Default',
        description: 'Fallback session policy for routes without a specific policy.',
        inactivityMinutes: 120,
        maximumSessionHours: 24,
        requireMfa: false,
        routePatterns: [],
        priority: 0,
        isDefault: true,
        isProtected: true,
      },
    ];
  }

  async ensureDefaultPolicies(): Promise<void> {
    const defaults = await this.getDefaults();

    for (const item of defaults) {
      await this.policyModel.updateOne(
        { key: item.key },
        {
          $setOnInsert: item,
        },
        { upsert: true },
      ).exec();
    }

    await this.policyModel.updateMany(
      { key: 'default', _id: { $ne: null } },
      { $set: { isDefault: true } },
    ).exec();
  }
}
