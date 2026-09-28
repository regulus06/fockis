import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import { extname } from 'path';

// ============================================================
// CONTROLLER
// ============================================================

import { PlaylistsController } from './controllers/playlists.controller';

// ============================================================
// SERVICES
// ============================================================

import { PlaylistsService } from './services/playlists.service';
import { ProducersService } from './services/producers.service';

// ============================================================
// PLAYLIST SCHEMAS
// ============================================================

import {
  Playlist,
  PlaylistSchema,
} from './schemas/playlist.schema';

import {
  PlaylistPurchase,
  PlaylistPurchaseSchema,
} from './schemas/playlist-purchase.schema';

import {
  PlaylistFavorite,
  PlaylistFavoriteSchema,
} from './schemas/playlist-favorite.schema';

import {
  PlaylistLibraryEntry,
  PlaylistLibraryEntrySchema,
} from './schemas/playlist-library-entry.schema';

import {
  PlayEvent,
  PlayEventSchema,
} from './schemas/play-event.schema';

// ============================================================
// PRODUCER SCHEMAS
// ============================================================

import {
  ProducerProfile,
  ProducerProfileSchema,
} from './schemas/producer-profile.schema';

import {
  ProducerFollow,
  ProducerFollowSchema,
} from './schemas/producer-follow.schema';

// ============================================================
// USER SCHEMA
// ============================================================

import {
  User,
  UserSchema,
} from '../users/user.schema';

// ============================================================
// PLAYLIST MODULE
// ============================================================

@Module({
  imports: [
    // ----------------------------------------------------------
    // JWT
    //
    // Required by OptionalJwtAuthGuard.
    // ----------------------------------------------------------

    JwtModule.register({}),

    // ----------------------------------------------------------
    // MONGOOSE MODELS
    // ----------------------------------------------------------

    MongooseModule.forFeature([
      // Playlist
      {
        name: Playlist.name,
        schema: PlaylistSchema,
      },

      // Playlist purchases
      {
        name: PlaylistPurchase.name,
        schema: PlaylistPurchaseSchema,
      },

      // Playlist favorites
      {
        name: PlaylistFavorite.name,
        schema: PlaylistFavoriteSchema,
      },

      // Playlist library
      {
        name: PlaylistLibraryEntry.name,
        schema: PlaylistLibraryEntrySchema,
      },

      // Play events
      {
        name: PlayEvent.name,
        schema: PlayEventSchema,
      },

      // Producer profile
      {
        name: ProducerProfile.name,
        schema: ProducerProfileSchema,
      },

      // Producer follows
      {
        name: ProducerFollow.name,
        schema: ProducerFollowSchema,
      },

      // User
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

    // ----------------------------------------------------------
    // MULTER
    //
    // Playlist cover-image uploads.
    // ----------------------------------------------------------

    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/playlist-covers',

        filename: (_req, file, callback) => {
          const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

          const extension =
            extname(file.originalname);

          callback(
            null,
            `${uniqueName}${extension}`,
          );
        },
      }),

      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  ],

  // ==========================================================
  // CONTROLLERS
  // ==========================================================

  controllers: [
    PlaylistsController,
  ],

  // ==========================================================
  // PROVIDERS
  // ==========================================================

  providers: [
    PlaylistsService,
    ProducersService,
  ],

  // ==========================================================
  // EXPORTS
  // ==========================================================

  exports: [
    PlaylistsService,
    ProducersService,
  ],
})
export class PlaylistsModule {}