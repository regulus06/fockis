import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

import {
  Storage,
} from "@google-cloud/storage";

import {
  createReadStream,
} from "fs";

import {
  randomUUID,
} from "crypto";

import {
  basename,
  extname,
} from "path";

@Injectable()
export class CloudStorageService {
  private readonly storage: Storage;

  private readonly bucketName: string;

  constructor() {
    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET ||
      "";

    if (!this.bucketName) {
      throw new Error(
        "GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",
      );
    }

    const serviceAccount =
      this.getServiceAccount();

    if (serviceAccount) {
      this.storage =
        new Storage({
          projectId:
            process.env.GOOGLE_CLOUD_PROJECT ||
            serviceAccount.project_id,

          credentials: {
            client_email:
              serviceAccount.client_email,

            private_key:
              serviceAccount.private_key?.replace(
                /\\n/g,
                "\n",
              ),
          },
        });
    } else {
      this.storage =
        new Storage({
          projectId:
            process.env.GOOGLE_CLOUD_PROJECT,
        });
    }
  }

  private getServiceAccount():
    | {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      }
    | null {
    const raw =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.",
      );
    }
  }

  async uploadFile(
    filePath: string,
    objectKey: string,
    contentType?: string,
  ) {
    try {
      const bucket =
        this.storage.bucket(
          this.bucketName,
        );

      const file =
        bucket.file(objectKey);

      await new Promise<void>(
        (resolve, reject) => {
          const readStream =
            createReadStream(
              filePath,
            );

          const writeStream =
            file.createWriteStream({
              resumable: true,

              metadata: {
                contentType:
                  contentType ||
                  "application/octet-stream",

                cacheControl:
                  "public, max-age=31536000",
              },
            });

          readStream.on(
            "error",
            reject,
          );

          writeStream.on(
            "error",
            reject,
          );

          writeStream.on(
            "finish",
            () => resolve(),
          );

          readStream.pipe(
            writeStream,
          );
        },
      );

      return objectKey;
    } catch (error) {
      console.error(
        "[GCS] Upload failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Failed to upload media to Google Cloud Storage.",
      );
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    contentType?: string,
  ) {
    try {
      const bucket =
        this.storage.bucket(
          this.bucketName,
        );

      const file =
        bucket.file(objectKey);

      await file.save(
        buffer,
        {
          resumable: false,

          metadata: {
            contentType:
              contentType ||
              "application/octet-stream",

            cacheControl:
              "public, max-age=31536000",
          },
        },
      );

      return objectKey;
    } catch (error) {
      console.error(
        "[GCS] Buffer upload failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Failed to upload media to Google Cloud Storage.",
      );
    }
  }

  async getSignedUrl(
    objectKey: string,
  ) {
    try {
      const bucket =
        this.storage.bucket(
          this.bucketName,
        );

      const file =
        bucket.file(objectKey);

      const [
        url,
      ] = await file.getSignedUrl({
        version: "v4",

        action: "read",

        expires:
          Date.now() +
          7 *
            24 *
            60 *
            60 *
            1000,
      });

      return url;
    } catch (error) {
      console.error(
        "[GCS] Signed URL failed:",
        error,
      );

      throw new InternalServerErrorException(
        "Failed to create Google Cloud Storage URL.",
      );
    }
  }

  async uploadAndSign(
    filePath: string,
    objectKey: string,
    contentType?: string,
  ) {
    await this.uploadFile(
      filePath,
      objectKey,
      contentType,
    );

    return this.getSignedUrl(
      objectKey,
    );
  }

  createObjectKey(
    folder: string,
    originalName: string,
  ) {
    const extension =
      extname(
        basename(
          originalName,
        ),
      ).toLowerCase();

    return `${folder}/${Date.now()}-${randomUUID()}${extension}`;
  }
}