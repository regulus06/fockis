import {
  BadRequestException,
} from "@nestjs/common";

import {
  diskStorage,
} from "multer";

import {
  extname,
} from "path";

import {
  randomUUID,
} from "crypto";

import {
  existsSync,
  mkdirSync,
} from "fs";

const uploadDirectory =
  process.env.MESSAGE_UPLOAD_DIR ||
  "./uploads/messages";

if (
  !existsSync(
    uploadDirectory,
  )
) {
  mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    },
  );
}

export const multerMessageOptions = {
  storage:
    diskStorage({
      destination:
        (
          _req,
          _file,
          callback,
        ) => {
          callback(
            null,
            uploadDirectory,
          );
        },

      filename:
        (
          _req,
          file,
          callback,
        ) => {
          const extension =
            extname(
              file.originalname,
            ).toLowerCase();

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
    }),

  limits: {
    /*
     * Voice messages are normally
     * very small, but keep the existing
     * general media limit.
     */
    fileSize:
      250 *
      1024 *
      1024,

    files: 10,
  },

  fileFilter:
    (
      _req,
      file,
      callback,
    ) => {
      if (
        !file.mimetype
      ) {
        callback(
          new BadRequestException(
            "File MIME type is missing",
          ),
          false,
        );

        return;
      }

      /*
       * Do not reject by MIME type here.
       *
       * UploadsService.validateFile()
       * performs the authoritative
       * MIME + extension validation.
       */
      callback(
        null,
        true,
      );
    },
};