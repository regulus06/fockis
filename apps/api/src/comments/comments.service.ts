import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './comment.schema';
import { assertInteractionAllowed } from '../policy-center/privacy-enforcement';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
  ) {}

  async createComment(data: {
    targetId: string;
    targetType: 'post' | 'wave' | 'reel' | 'story';
    userId: string;
    username: string;
    userPhoto?: string;
    content: string;
    parentCommentId?: string;
  }) {
    if (data.targetType === 'post') {
      const posts = this.commentModel.db?.models?.['Post'];
      const post: any = posts
        ? await posts.findById(data.targetId).select('user').lean().exec().catch(() => null)
        : null;
      if (post?.user) {
        await assertInteractionAllowed(this.commentModel.db, 'comments', String(data.userId), String(post.user));
      }
    }
    return this.commentModel.create({
      ...data,
      parentCommentId: data.parentCommentId ?? null,
    });
  }

  async getComments(targetId: string) {
    return this.commentModel
      .find({ targetId })
      .sort({ createdAt: -1 });
  }

  async deleteComment(id: string) {
    return this.commentModel.findByIdAndDelete(id);
  }

  async likeComment(id: string) {
    return this.commentModel.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true },
    );
  }
}