/**
 * organization-follow.service.ts
 *   follow / unfollow an organization and read the follower count.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { OrganizationFollow } from './organization-follow.schema';
import { Organization } from '../organizations/schemas/organization.schema';

@Injectable()
export class OrganizationFollowService {
  constructor(
    @InjectModel(OrganizationFollow.name) private readonly followModel: Model<any>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<any>,
  ) {}

  private oid(id: string, what: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  private async requireOrganization(orgId: Types.ObjectId): Promise<void> {
    const exists = await this.organizationModel.exists({ _id: orgId });
    if (!exists) throw new NotFoundException('Organization not found.');
  }

  async status(organizationId: string, userId?: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const [followers, mine] = await Promise.all([
      this.followModel.countDocuments({ organizationId: orgId }),
      userId && Types.ObjectId.isValid(userId)
        ? this.followModel.exists({ organizationId: orgId, userId: new Types.ObjectId(userId) })
        : Promise.resolve(null),
    ]);
    return { organizationId, followers, following: Boolean(mine) };
  }

  async follow(organizationId: string, userId: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const uid = this.oid(userId, 'user ID');
    await this.requireOrganization(orgId);
    await this.followModel.updateOne(
      { organizationId: orgId, userId: uid },
      { $setOnInsert: { organizationId: orgId, userId: uid } },
      { upsert: true },
    );
    return this.status(organizationId, userId);
  }

  async unfollow(organizationId: string, userId: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const uid = this.oid(userId, 'user ID');
    await this.followModel.deleteOne({ organizationId: orgId, userId: uid });
    return this.status(organizationId, userId);
  }
}
