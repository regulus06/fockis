import { Injectable } from '@nestjs/common';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../../users/user.schema';
import { Post } from '../../posts/post.schema';
import { Comment } from '../../comments/comment.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
  ) {}

  // =========================
  // SHARED BASE STATS (OPTIMIZED)
  // =========================
  private async baseStats(last24h: Date) {
    return Promise.all([
      this.userModel.countDocuments(),
      this.postModel.countDocuments(),
      this.commentModel.countDocuments(),

      this.userModel.countDocuments({
        lastActiveAt: { $gte: last24h },
      }),

      this.userModel.countDocuments({
        createdAt: { $gte: last24h },
      }),

      this.postModel.countDocuments({
        createdAt: { $gte: last24h },
      }),
    ]);
  }

  // =========================
  // FULL DASHBOARD (HTTP)
  // =========================
  async getDashboard(query: DashboardQueryDto) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
      recentUsers,
      recentPosts,
    ] = await this.baseStats(last24h);

    return {
      overview: {
        totalUsers,
        totalPosts,
        totalComments,
        activeUsers,
      },

      growth: {
        newUsers24h: recentUsers,
        newPosts24h: recentPosts,
      },

      system: {
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        status: 'healthy',
        timestamp: new Date(),
      },

      range: query.range || '24h',
    };
  }

  // =========================
  // LIVE METRICS (WEBSOCKET)
  // =========================
  async getMetrics() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalComments,
      activeUsers,
      newUsers24h,
      newPosts24h,
    ] = await this.baseStats(last24h);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new24h: newUsers24h,
      },

      posts: {
        total: totalPosts,
        new24h: newPosts24h,
      },

      comments: {
        total: totalComments,
      },

      system: {
        uptime: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp: new Date(),
      },
    };
  }
}