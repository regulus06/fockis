import { Injectable } from "@nestjs/common";
import ffmpeg = require("fluent-ffmpeg");
import { randomUUID } from "crypto";
import { join } from "path";
import { mkdir } from "fs/promises";

@Injectable()
export class ThumbnailService {
  async generateVideoThumbnail(
    inputPath: string,
  ): Promise<{
    url: string;
    path: string;
  }> {
    const outputDirectory =
      "uploads/thumbnails";

    await mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const thumbnailName =
      `${randomUUID()}.jpg`;

    const outputPath =
      join(
        outputDirectory,
        thumbnailName,
      );

    return new Promise(
      (
        resolve,
        reject,
      ) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: ["00:00:01"],
            filename:
              thumbnailName,
            folder:
              outputDirectory,
            size: "720x?",
          })
          .on(
            "end",
            () => {
              resolve({
                url:
                  `/uploads/thumbnails/${thumbnailName}`,

                path:
                  outputPath,
              });
            },
          )
          .on(
            "error",
            (error) => {
              reject(error);
            },
          );
      },
    );
  }
}