import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';


/**
 * Stores a user's favorite/hearted playlists.
 *
 * This is separate from:
 * - playlist purchases
 * - playlist library entries
 *
 * A user can favorite a playlist without purchasing it
 * or adding it to their library.
 */
@Schema({
  timestamps: true,
})
export class PlaylistFavorite {
  /**
   * User who favorited the playlist.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;


  /**
   * Playlist that was favorited.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Playlist',
    required: true,
    index: true,
  })
  playlistId!: Types.ObjectId;
}


export type PlaylistFavoriteDocument =
  PlaylistFavorite & Document;


export const PlaylistFavoriteSchema =
  SchemaFactory.createForClass(
    PlaylistFavorite,
  );


/**
 * Prevent duplicate favorites.
 *
 * A user can only favorite the same playlist once.
 */
PlaylistFavoriteSchema.index(
  {
    userId: 1,
    playlistId: 1,
  },
  {
    unique: true,
  },
);