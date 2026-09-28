import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  ProducerTeamMember,
  ProducerTeamMemberDocument,
  ProducerTeamMemberStatus,
  ProducerTeamPermissions,
  ProducerTeamRole,
} from '../schemas/producer-team.schema';

import {
  ProducerService,
} from './producer.service';

type NonOwnerRole =
  Exclude<
    ProducerTeamRole,
    'owner'
  >;

interface TeamPermissionsInput {
  profile?: boolean;
  content?: boolean;
  publishing?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  moderation?: boolean;
  team?: boolean;
  earnings?: boolean;
}

interface InviteTeamMemberInput {
  email?: string;
  role?: NonOwnerRole;
  permissions?: TeamPermissionsInput;
}

interface UpdateTeamMemberInput {
  role?: NonOwnerRole;
  permissions?: TeamPermissionsInput;
}

@Injectable()
export class ProducerTeamService {
  constructor(
    @InjectModel(
      ProducerTeamMember.name,
    )
    private readonly teamModel:
      Model<ProducerTeamMemberDocument>,

    private readonly producerService:
      ProducerService,
  ) {}

  // ==========================================================================
  // PERMISSIONS
  // ==========================================================================

  private defaultPermissions(): ProducerTeamPermissions {
    return {
      profile: false,
      content: false,
      publishing: false,
      analytics: false,
      marketing: false,
      moderation: false,
      team: false,
      earnings: false,
    };
  }

  private rolePermissions(
    role: ProducerTeamRole,
  ): ProducerTeamPermissions {
    switch (role) {
      case 'owner':
        return {
          profile: true,
          content: true,
          publishing: true,
          analytics: true,
          marketing: true,
          moderation: true,
          team: true,
          earnings: true,
        };

      case 'admin':
        return {
          profile: true,
          content: true,
          publishing: true,
          analytics: true,
          marketing: true,
          moderation: true,
          team: true,
          earnings: false,
        };

      case 'manager':
        return {
          profile: true,
          content: true,
          publishing: true,
          analytics: true,
          marketing: false,
          moderation: false,
          team: false,
          earnings: false,
        };

      case 'editor':
        return {
          profile: false,
          content: true,
          publishing: false,
          analytics: false,
          marketing: false,
          moderation: false,
          team: false,
          earnings: false,
        };

      case 'marketing':
        return {
          profile: false,
          content: false,
          publishing: false,
          analytics: true,
          marketing: true,
          moderation: false,
          team: false,
          earnings: false,
        };

      case 'analyst':
        return {
          profile: false,
          content: false,
          publishing: false,
          analytics: true,
          marketing: false,
          moderation: false,
          team: false,
          earnings: false,
        };

      case 'moderator':
        return {
          profile: false,
          content: true,
          publishing: false,
          analytics: false,
          marketing: false,
          moderation: true,
          team: false,
          earnings: false,
        };

      default:
        return this.defaultPermissions();
    }
  }

  private normalizePermissions(
    permissions?: TeamPermissionsInput,
  ): ProducerTeamPermissions {
    const defaults =
      this.defaultPermissions();

    if (!permissions) {
      return defaults;
    }

    return {
      profile:
        Boolean(permissions.profile),

      content:
        Boolean(permissions.content),

      publishing:
        Boolean(permissions.publishing),

      analytics:
        Boolean(permissions.analytics),

      marketing:
        Boolean(permissions.marketing),

      moderation:
        Boolean(permissions.moderation),

      team:
        Boolean(permissions.team),

      earnings:
        Boolean(permissions.earnings),
    };
  }

  private mergePermissionsWithRole(
    role: ProducerTeamRole,
    custom?: TeamPermissionsInput,
  ): ProducerTeamPermissions {
    const roleDefaults =
      this.rolePermissions(role);

    if (!custom) {
      return roleDefaults;
    }

    return {
      profile:
        custom.profile ??
        roleDefaults.profile,

      content:
        custom.content ??
        roleDefaults.content,

      publishing:
        custom.publishing ??
        roleDefaults.publishing,

      analytics:
        custom.analytics ??
        roleDefaults.analytics,

      marketing:
        custom.marketing ??
        roleDefaults.marketing,

      moderation:
        custom.moderation ??
        roleDefaults.moderation,

      team:
        custom.team ??
        roleDefaults.team,

      earnings:
        custom.earnings ??
        roleDefaults.earnings,
    };
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  private validateUserId(
    userId: string,
  ): void {
    if (
      !userId ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid user ID.',
      );
    }
  }

  private validateMemberId(
    memberId: string,
  ): void {
    if (
      !memberId ||
      !Types.ObjectId.isValid(memberId)
    ) {
      throw new BadRequestException(
        'Invalid team member ID.',
      );
    }
  }

  private normalizeEmail(
    email?: string,
  ): string {
    const normalized =
      email
        ?.trim()
        .toLowerCase();

    if (!normalized) {
      throw new BadRequestException(
        'Email address is required.',
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalized,
      )
    ) {
      throw new BadRequestException(
        'Please provide a valid email address.',
      );
    }

    return normalized;
  }

  private validateRole(
    role?: string,
  ): NonOwnerRole {
    const allowed: NonOwnerRole[] = [
      'admin',
      'manager',
      'editor',
      'marketing',
      'analyst',
      'moderator',
    ];

    if (
      !role ||
      !allowed.includes(
        role as NonOwnerRole,
      )
    ) {
      throw new BadRequestException(
        'Invalid team member role.',
      );
    }

    return role as NonOwnerRole;
  }

  // ==========================================================================
  // OWNER
  // ==========================================================================

  private async ensureOwner(
    userId: string,
  ): Promise<ProducerTeamMemberDocument> {
    this.validateUserId(userId);

    const profile =
      await this.producerService
        .requireApprovedProducer(
          userId,
        );

    const producerId =
      profile._id as Types.ObjectId;

    const existingOwner =
      await this.teamModel.findOne({
        producerId,
        role: 'owner',
      });

    if (existingOwner) {
      return existingOwner;
    }

    const owner =
      await this.teamModel.create({
        producerId,

        userId:
          new Types.ObjectId(
            userId,
          ),

        email:
          `owner-${userId}@fockis.local`,

        name:
          profile.producerName ||
          'Producer Owner',

        role: 'owner',

        status: 'active',

        permissions:
          this.rolePermissions(
            'owner',
          ),

        invitedAt: null,

        joinedAt:
          new Date(),
      });

    return owner;
  }

  // ==========================================================================
  // CURRENT ACTOR
  // ==========================================================================

  private async getActor(
    userId: string,
  ): Promise<{
    producerId: Types.ObjectId;
    member: ProducerTeamMemberDocument;
  }> {
    this.validateUserId(userId);

    const owner =
      await this.ensureOwner(
        userId,
      );

    const producerId =
      owner.producerId;

    let member =
      await this.teamModel.findOne({
        producerId,
        userId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!member) {
      throw new ForbiddenException(
        'You are not a member of this producer team.',
      );
    }

    if (
      member.status ===
      'suspended'
    ) {
      throw new ForbiddenException(
        'Your producer team access is suspended.',
      );
    }

    return {
      producerId,
      member,
    };
  }

  private requireTeamManagementAccess(
    member: ProducerTeamMemberDocument,
  ): void {
    if (
      member.role !== 'owner' &&
      member.role !== 'admin'
    ) {
      throw new ForbiddenException(
        'Only the producer owner or an administrator can manage team members.',
      );
    }

    if (
      !member.permissions.team
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage the producer team.',
      );
    }
  }

  // ==========================================================================
  // LIST TEAM
  // ==========================================================================

  async getTeam(
    userId: string,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    const members =
      await this.teamModel
        .find({
          producerId,
        })
        .sort({
          role: 1,
          createdAt: 1,
        })
        .lean();

    return {
      members:
        members.map(
          (item) =>
            this.formatMember(
              item,
            ),
        ),
    };
  }

  // ==========================================================================
  // INVITE
  // ==========================================================================

  async inviteTeamMember(
    userId: string,
    input: InviteTeamMemberInput,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    const email =
      this.normalizeEmail(
        input.email,
      );

    const role =
      this.validateRole(
        input.role,
      );

    const existing =
      await this.teamModel.findOne({
        producerId,
        email,
      });

    if (existing) {
      if (
        existing.status ===
        'suspended'
      ) {
        existing.status =
          'invited';

        existing.role =
          role;

        existing.permissions =
          this.mergePermissionsWithRole(
            role,
            input.permissions,
          );

        existing.invitedAt =
          new Date();

        await existing.save();

        return {
          success: true,
          message:
            'Team member invitation restored.',
          member:
            this.formatMember(
              existing,
            ),
        };
      }

      throw new ConflictException(
        'This email address is already part of the producer team.',
      );
    }

    const newMember =
      await this.teamModel.create({
        producerId,

        userId: null,

        email,

        name:
          this.nameFromEmail(
            email,
          ),

        role,

        status: 'invited',

        permissions:
          this.mergePermissionsWithRole(
            role,
            input.permissions,
          ),

        invitedAt:
          new Date(),

        joinedAt: null,
      });

    return {
      success: true,

      message:
        'Team member invited successfully.',

      member:
        this.formatMember(
          newMember,
        ),
    };
  }

  // ==========================================================================
  // UPDATE MEMBER
  // ==========================================================================

  async updateTeamMember(
    userId: string,
    memberId: string,
    input: UpdateTeamMemberInput,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    this.validateMemberId(
      memberId,
    );

    const target =
      await this.teamModel.findOne({
        _id:
          new Types.ObjectId(
            memberId,
          ),
        producerId,
      });

    if (!target) {
      throw new NotFoundException(
        'Team member not found.',
      );
    }

    if (
      target.role === 'owner'
    ) {
      throw new ForbiddenException(
        'The producer owner cannot be modified from team management.',
      );
    }

    if (
      input.role !== undefined
    ) {
      target.role =
        this.validateRole(
          input.role,
        );
    }

    if (
      input.permissions !==
      undefined
    ) {
      target.permissions =
        this.mergePermissionsWithRole(
          target.role,
          input.permissions,
        );
    } else if (
      input.role !== undefined
    ) {
      target.permissions =
        this.rolePermissions(
          target.role,
        );
    }

    await target.save();

    return {
      success: true,

      message:
        'Team member updated successfully.',

      member:
        this.formatMember(
          target,
        ),
    };
  }

  // ==========================================================================
  // SUSPEND
  // ==========================================================================

  async suspendTeamMember(
    userId: string,
    memberId: string,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    this.validateMemberId(
      memberId,
    );

    const target =
      await this.teamModel.findOne({
        _id:
          new Types.ObjectId(
            memberId,
          ),
        producerId,
      });

    if (!target) {
      throw new NotFoundException(
        'Team member not found.',
      );
    }

    if (
      target.role === 'owner'
    ) {
      throw new ForbiddenException(
        'The producer owner cannot be suspended.',
      );
    }

    target.status =
      'suspended';

    await target.save();

    return {
      success: true,

      message:
        'Team member suspended.',

      member:
        this.formatMember(
          target,
        ),
    };
  }

  // ==========================================================================
  // RESTORE
  // ==========================================================================

  async restoreTeamMember(
    userId: string,
    memberId: string,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    this.validateMemberId(
      memberId,
    );

    const target =
      await this.teamModel.findOne({
        _id:
          new Types.ObjectId(
            memberId,
          ),
        producerId,
      });

    if (!target) {
      throw new NotFoundException(
        'Team member not found.',
      );
    }

    if (
      target.role === 'owner'
    ) {
      throw new ForbiddenException(
        'The producer owner cannot be restored.',
      );
    }

    target.status =
      'active';

    if (!target.joinedAt) {
      target.joinedAt =
        new Date();
    }

    await target.save();

    return {
      success: true,

      message:
        'Team member restored.',

      member:
        this.formatMember(
          target,
        ),
    };
  }

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  async removeTeamMember(
    userId: string,
    memberId: string,
  ) {
    const {
      producerId,
      member,
    } =
      await this.getActor(
        userId,
      );

    this.requireTeamManagementAccess(
      member,
    );

    this.validateMemberId(
      memberId,
    );

    const target =
      await this.teamModel.findOne({
        _id:
          new Types.ObjectId(
            memberId,
          ),
        producerId,
      });

    if (!target) {
      throw new NotFoundException(
        'Team member not found.',
      );
    }

    if (
      target.role === 'owner'
    ) {
      throw new ForbiddenException(
        'The producer owner cannot be removed.',
      );
    }

    await this.teamModel.deleteOne({
      _id:
        target._id,
    });

    return {
      success: true,

      message:
        'Team member removed.',
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private nameFromEmail(
    email: string,
  ): string {
    const localPart =
      email.split('@')[0] ||
      'Team Member';

    return localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
  }

  private formatMember(
    member: any,
  ) {
    return {
      id:
        String(
          member._id,
        ),

      userId:
        member.userId
          ? String(
              member.userId,
            )
          : null,

      email:
        member.email,

      name:
        member.name,

      role:
        member.role,

      status:
        member.status,

      permissions:
        {
          profile:
            Boolean(
              member.permissions?.profile,
            ),

          content:
            Boolean(
              member.permissions?.content,
            ),

          publishing:
            Boolean(
              member.permissions?.publishing,
            ),

          analytics:
            Boolean(
              member.permissions?.analytics,
            ),

          marketing:
            Boolean(
              member.permissions?.marketing,
            ),

          moderation:
            Boolean(
              member.permissions?.moderation,
            ),

          team:
            Boolean(
              member.permissions?.team,
            ),

          earnings:
            Boolean(
              member.permissions?.earnings,
            ),
        },

      invitedAt:
        member.invitedAt ||
        null,

      joinedAt:
        member.joinedAt ||
        null,

      updatedAt:
        member.updatedAt ||
        null,
    };
  }
}