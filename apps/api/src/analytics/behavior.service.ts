import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Behavior, BehaviorDocument, BehaviorType } from './behavior.schema';

@Injectable()
export class BehaviorService {
  constructor(
    @InjectModel(Behavior.name)
    private behaviorModel: Model<BehaviorDocument>,
  ) {}

  // =========================
  // TRACK GENERIC EVENT
  // =========================
  async track(data: {
    userId: string;
    contentId: string;
    contentType: 'post' | 'wave' | 'reel' | 'story';
    type: BehaviorType;
    watchTime?: number;
    meta?: any;
  }) {
    return this.behaviorModel.create({
      ...data,
      meta: data.meta || {},
    });
  }

  // =========================
  // WATCH TIME FIX (IMPORTANT)
  // =========================
  async trackWatchTime(
    userId: string,
    contentId: string,
    seconds: number,
  ) {
    return this.behaviorModel.create({
      userId,
      contentId,
      contentType: 'wave',
      type: 'watch_time',
      watchTime: seconds,
      meta: {},
    });
  }

  // =========================
  // USER HISTORY
  // =========================
  async getUserBehavior(userId: string) {
    return this.behaviorModel.find({ userId }).sort({ createdAt: -1 });
  }

  // =========================
  // CONTENT SCORE (FOR AI FEED)
  // =========================
  async getContentScore(contentId: string) {
    const events = await this.behaviorModel.find({ contentId });

    return events.reduce((score, e) => {
      switch (e.type) {
        case 'view':
          return score + 1;
        case 'watch_time':
          return score + (e.watchTime || 0);
        case 'like':
          return score + 5;
        case 'comment':
          return score + 7;
        case 'share':
          return score + 10;
        case 'repost':
          return score + 8;
        case 'click':
          return score + 2;
        default:
          return score;
      }
    }, 0);
  }
}