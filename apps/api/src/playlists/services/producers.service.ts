import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  ProducerProfile,
  ProducerProfileDocument,
} from '../schemas/producer-profile.schema';

import {
  ProducerFollow,
  ProducerFollowDocument,
} from '../schemas/producer-follow.schema';

import {
  Playlist,
  PlaylistDocument,
} from '../schemas/playlist.schema';


interface LeanUser {
  _id: Types.ObjectId;

  username: string;

  displayName: string;

  avatarUrl: string;
}


interface ProducerProfileLike {
  _id: Types.ObjectId;

  userId: Types.ObjectId;

  category?: string;

  verified?: boolean;

  followerCount?: number;

  releaseCount?: number;

  bio?: string;
}


const FEATURED_LIMIT = 10;


@Injectable()
export class ProducersService {
  constructor(
    @InjectModel(ProducerProfile.name)
    private readonly profileModel: Model<ProducerProfileDocument>,

    @InjectModel(ProducerFollow.name)
    private readonly followModel: Model<ProducerFollowDocument>,

    @InjectModel(Playlist.name)
    private readonly playlistModel: Model<PlaylistDocument>,

    @InjectModel('User')
    private readonly userModel: Model<
      LeanUser & {
        _id: Types.ObjectId;
      }
    >,
  ) {}


  // ---------------------------------------------------------------------------
  // FEATURED PRODUCERS
  // ---------------------------------------------------------------------------

  async getFeatured(
    currentUserId?: string,
  ) {
    const profiles =
      await this.profileModel
        .find()
        .sort({
          followerCount: -1,
        })
        .limit(FEATURED_LIMIT)
        .lean();

    return this.serializeList(
      profiles as unknown as ProducerProfileLike[],
      currentUserId,
    );
  }


  // ---------------------------------------------------------------------------
  // PRODUCER BY USERNAME
  // ---------------------------------------------------------------------------

  async getByUsername(
    username: string,
    currentUserId?: string,
  ) {
    const user =
      await this.userModel
        .findOne({
          username,
        })
        .lean();

    if (!user) {
      throw new NotFoundException(
        'Producer not found.',
      );
    }


    const profile =
      await this.profileModel
        .findOne({
          userId: user._id,
        })
        .lean();

    if (!profile) {
      throw new NotFoundException(
        'This account has not published as a producer.',
      );
    }


    const serialized =
      await this.serializeList(
        [
          profile as unknown as ProducerProfileLike,
        ],
        currentUserId,
      );


    return serialized[0] ?? null;
  }


  // ---------------------------------------------------------------------------
  // FOLLOW PRODUCER
  // ---------------------------------------------------------------------------

  async follow(
    currentUserId: string,
    producerUserId: string,
  ) {
    const followerId =
      new Types.ObjectId(
        currentUserId,
      );

    const producerId =
      new Types.ObjectId(
        producerUserId,
      );


    const result =
      await this.followModel.updateOne(
        {
          followerId,
          producerId,
        },

        {
          $setOnInsert: {
            followerId,
            producerId,
          },
        },

        {
          upsert: true,
        },
      );


    if (result.upsertedCount > 0) {
      await this.profileModel.updateOne(
        {
          userId: producerId,
        },

        {
          $inc: {
            followerCount: 1,
          },
        },
      );
    }


    return {
      success: true,

      following: true,
    };
  }


  // ---------------------------------------------------------------------------
  // UNFOLLOW PRODUCER
  // ---------------------------------------------------------------------------

  async unfollow(
    currentUserId: string,
    producerUserId: string,
  ) {
    const followerId =
      new Types.ObjectId(
        currentUserId,
      );

    const producerId =
      new Types.ObjectId(
        producerUserId,
      );


    const result =
      await this.followModel.deleteOne({
        followerId,
        producerId,
      });


    if (result.deletedCount > 0) {
      await this.profileModel.updateOne(
        {
          userId: producerId,
        },

        {
          $inc: {
            followerCount: -1,
          },
        },
      );
    }


    return {
      success: true,

      following: false,
    };
  }


  // ---------------------------------------------------------------------------
  // MY FAVORITE PRODUCERS
  // ---------------------------------------------------------------------------

  async getMyFavoriteProducers(
    currentUserId: string,
  ) {
    const followerId =
      new Types.ObjectId(
        currentUserId,
      );


    const follows =
      await this.followModel
        .find({
          followerId,
        })
        .select('producerId')
        .lean();


    const producerIds =
      follows.map(
        (follow) =>
          follow.producerId,
      );


    if (producerIds.length === 0) {
      return [];
    }


    const profiles =
      await this.profileModel
        .find({
          userId: {
            $in: producerIds,
          },
        })
        .lean();


    return this.serializeList(
      profiles as unknown as ProducerProfileLike[],
      currentUserId,
    );
  }


  // ---------------------------------------------------------------------------
  // RECALCULATE RELEASE COUNT
  // ---------------------------------------------------------------------------

  async recalculateReleaseCount(
    userId: string,
  ) {
    const creatorId =
      new Types.ObjectId(
        userId,
      );


    const count =
      await this.playlistModel.countDocuments({
        creatorId,

        status: 'published',
      });


    await this.profileModel.updateOne(
      {
        userId: creatorId,
      },

      {
        $set: {
          releaseCount: count,
        },
      },
    );


    return {
      success: true,

      releaseCount: count,
    };
  }


  // ---------------------------------------------------------------------------
  // SERIALIZATION
  // ---------------------------------------------------------------------------

  private async serializeList(
    profiles: ProducerProfileLike[],
    currentUserId?: string,
  ) {
    if (profiles.length === 0) {
      return [];
    }


    const userIds =
      profiles.map(
        (profile) =>
          profile.userId,
      );


    const users =
      await this.userModel
        .find({
          _id: {
            $in: userIds,
          },
        })
        .select(
          'username displayName avatarUrl',
        )
        .lean();


    const usersById =
      new Map(
        users.map(
          (user) => [
            String(user._id),
            user,
          ],
        ),
      );


    let followedIds =
      new Set<string>();


    if (currentUserId) {
      const follows =
        await this.followModel
          .find({
            followerId:
              new Types.ObjectId(
                currentUserId,
              ),

            producerId: {
              $in: userIds,
            },
          })
          .select('producerId')
          .lean();


      followedIds =
        new Set(
          follows.map(
            (follow) =>
              String(
                follow.producerId,
              ),
          ),
        );
    }


    return profiles
      .map((profile) => {
        const user =
          usersById.get(
            String(
              profile.userId,
            ),
          );


        if (!user) {
          return null;
        }


        return {
          id: String(user._id),

          username:
            user.username,

          displayName:
            user.displayName,

          avatarUrl:
            user.avatarUrl,

          category:
            profile.category ??
            'music-producer',

          verified:
            profile.verified ??
            false,

          followerCount:
            profile.followerCount ??
            0,

          releaseCount:
            profile.releaseCount ??
            0,

          bio:
            profile.bio ??
            '',

          isFollowedByCurrentUser:
            followedIds.has(
              String(user._id),
            ),
        };
      })

      .filter(
        (
          producer,
        ): producer is NonNullable<
          typeof producer
        > =>
          producer !== null,
      );
  }
}