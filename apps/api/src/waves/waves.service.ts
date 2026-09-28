import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wave, WaveDocument } from './schemas/waves.schema';

@Injectable()
export class WavesService {
  constructor(
    @InjectModel(Wave.name)
    private readonly waveModel: Model<WaveDocument>,
  ) {}

  // =====================
  // CREATE WAVE
  // =====================
  async createWave(data: any) {
    return this.waveModel.create({
      ...data,
      likes: 0,
      views: 0,
      shares: 0,
      reposts: 0,
      commentsCount: 0,
    });
  }

  // =====================
  // LIKE
  // =====================
  async likeWave(id: string) {
    return this.waveModel.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true },
    );
  }

  // =====================
  // VIEW
  // =====================
  async addView(id: string) {
    return this.waveModel.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );
  }

  // =====================
  // SHARE
  // =====================
  async shareWave(id: string) {
    return this.waveModel.findByIdAndUpdate(
      id,
      { $inc: { shares: 1 } },
      { new: true },
    );
  }

  // =====================
  // REPOST
  // =====================
  async repostWave(data: {
    waveId: string;
    userId: string;
    type: 'profile' | 'group' | 'feed';
    groupId?: any;
  }) {
    const original = await this.waveModel.findById(data.waveId);

    if (!original) {
      return null;
    }

    await this.waveModel.findByIdAndUpdate(original._id, {
      $inc: { reposts: 1 },
    });

    const repostTo: any = {
      type: data.type,
    };

    if (data.groupId) {
      repostTo.groupId = data.groupId;
    }

    return this.waveModel.create({
      userId: data.userId,

      videoUrl: original.videoUrl,
      thumbnailUrl: original.thumbnailUrl,
      musicUrl: original.musicUrl,
      caption: original.caption,

      originalWaveId: original._id,
      repostedBy: data.userId,

      repostTo,

      likes: 0,
      views: 0,
      shares: 0,
      reposts: 0,
      commentsCount: 0,
    });
  }

  // =====================
  // QUOTE WAVE
  // =====================
  async quoteWave(data: {
    waveId: string;
    userId: string;
    text: string;
  }) {
    const original = await this.waveModel.findById(data.waveId);

    if (!original) {
      return null;
    }

    return this.waveModel.create({
      userId: data.userId,

      videoUrl: original.videoUrl,
      thumbnailUrl: original.thumbnailUrl,
      musicUrl: original.musicUrl,
      caption: original.caption,

      originalWaveId: original._id,
      repostedBy: data.userId,

      quote: {
        text: data.text,
        userId: data.userId,
      },

      likes: 0,
      views: 0,
      shares: 0,
      reposts: 0,
      commentsCount: 0,
    });
  }

  // =====================
  // FEED
  // =====================
  async getWaves(limit = 10, cursor?: string) {
    const query: any = {};

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const items = await this.waveModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      items,
      nextCursor: items.length ? items[items.length - 1]._id : null,
    };
  }

  // =====================
  // FOR YOU
  // =====================
  async getForYouFeed(limit = 10) {
    return this.getWaves(limit);
  }

  // =====================
  // GET ONE
  // =====================
  async getWaveById(id: string) {
    return this.waveModel.findById(id);
  }
}