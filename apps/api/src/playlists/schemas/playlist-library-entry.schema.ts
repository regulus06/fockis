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
 * Stores playlists that a user has explicitly added
 * to their personal library.
 *
 * This is independent of:
 * - favorites
 * - purchases
 */
@Schema({
  timestamps: true,
})
export class PlaylistLibraryEntry {
  /**
   * User who owns this library entry.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;


  /**
   * Playlist added to the user's library.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Playlist',
    required: true,
    index: true,
  })
  playlistId!: Types.ObjectId;
}


export type PlaylistLibraryEntryDocument =
  PlaylistLibraryEntry & Document;


export const PlaylistLibraryEntrySchema =
  SchemaFactory.createForClass(
    PlaylistLibraryEntry,
  );


/**
 * Prevent the same playlist from being
 * added to the same user's library twice.
 */
PlaylistLibraryEntrySchema.index(
  {
    userId: 1,
    playlistId: 1,
  },
  {
    unique: true,
  },
);