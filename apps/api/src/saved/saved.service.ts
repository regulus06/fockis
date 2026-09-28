import {
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  Saved,
  SavedDocument,
} from "./schemas/saved.schema";


@Injectable()
export class SavedService {


  constructor(

    @InjectModel(Saved.name)
    private readonly savedModel:
      Model<SavedDocument>,

  ) {}



  /*
  ============================================================================
  SAVE
  ============================================================================
  */

  async save(
    userId: string,
    postId: string,
  ) {

    const existing =
      await this.savedModel.findOne({

        userId,

        postId,

      });


    if (existing) {

      return existing;

    }


    return this.savedModel.create({

      userId,

      postId,

    });

  }



  /*
  ============================================================================
  REMOVE
  ============================================================================
  */

  async remove(
    userId: string,
    postId: string,
  ) {

    return this.savedModel.findOneAndDelete({

      userId,

      postId,

    });

  }



  /*
  ============================================================================
  GET SAVED POSTS
  ============================================================================
  */

  async findAll(
    userId: string,
  ) {

    const items =
      await this.savedModel

        .find({

          userId,

        })

        .populate("postId")

        .sort({

          createdAt: -1,

        })

        .lean();


    /*
    --------------------------------------------------------------------------
    Normalize each saved post.

    We do NOT populate user/author here because the exact Post schema may
    use different field names. This prevents the 500 caused by an invalid
    nested populate path.
    --------------------------------------------------------------------------
    */

    return items.map(
      (item: any) => {

        const post =
          item.postId;


        /*
        Deleted post.
        */

        if (
          !post ||
          typeof post !== "object"
        ) {

          return item;

        }


        /*
        ----------------------------------------------------------------------
        FIND MEDIA
        ----------------------------------------------------------------------
        */

        let media =
          post.media;


        /*
        Some posts may use image.
        */

        if (
          !media &&
          post.image
        ) {

          media =
            post.image;

        }


        /*
        Some posts may use images[].
        */

        if (
          !media &&
          Array.isArray(post.images) &&
          post.images.length > 0
        ) {

          media =
            post.images;

        }


        /*
        ----------------------------------------------------------------------
        NORMALIZE IMAGE
        ----------------------------------------------------------------------
        */

        if (
          typeof media === "string" &&
          media.trim() !== ""
        ) {

          post.image =
            media;

          post.images = [
            media,
          ];

        }


        else if (
          Array.isArray(media) &&
          media.length > 0
        ) {

          /*
          Handle:

          media: [
            "/uploads/photo.jpg"
          ]
          */

          const first =
            media[0];


          /*
          If media contains objects such as:

          {
            url: "/uploads/photo.jpg"
          }

          use the URL.
          */

          const firstUrl =
            typeof first === "string"
              ? first
              : first?.url ||
                first?.src ||
                first?.path ||
                "";


          if (firstUrl) {

            post.image =
              firstUrl;

          }


          post.images =
            media
              .map(
                (entry: any) => {

                  if (
                    typeof entry === "string"
                  ) {

                    return entry;

                  }

                  return (
                    entry?.url ||
                    entry?.src ||
                    entry?.path ||
                    null
                  );

                },
              )
              .filter(Boolean);

        }


        /*
        ----------------------------------------------------------------------
        NORMALIZE AUTHOR
        ----------------------------------------------------------------------
        */

        if (
          !post.author &&
          post.user
        ) {

          post.author =
            post.user;

        }


        /*
        If the post has creator instead of author/user,
        expose it as author too.
        */

        if (
          !post.author &&
          post.creator
        ) {

          post.author =
            post.creator;

        }


        return {

          ...item,

          postId:
            post,

        };

      },
    );

  }



  /*
  ============================================================================
  CHECK
  ============================================================================
  */

  async check(
    userId: string,
    postId: string,
  ) {

    const existing =
      await this.savedModel.findOne({

        userId,

        postId,

      });


    return {

      saved:
        !!existing,

    };

  }

}
