import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repost, RepostDocument } from './repost.schema';

@Injectable()
export class RepostsService {
  constructor(
    @InjectModel(Repost.name)
    private repostModel: Model<RepostDocument>,
  ) {}

  // =========================
  // CREATE REPOST
  // =========================
  async createRepost(data: {
    userId: string;
    username: string;
    targetId: string;
    targetType: 'post' | 'wave' | 'reel';
    destination: 'profile' | 'group' | 'feed';
    groupId?: string;
    quote?: string;
  }) {
    return this.repostModel.create({
      ...data,
      groupId: data.groupId || null,
      quote: data.quote || '',
    });
  }

  // =========================
  // GET FEED REPOSTS
  // =========================
  async getFeedReposts() {
    return this.repostModel
      .find({ destination: 'feed' })
      .sort({ createdAt: -1 });
  }

  // =========================
  // GET USER REPOSTS
  // =========================
  async getUserReposts(userId: string) {
    return this.repostModel.find({ userId });
  }
}