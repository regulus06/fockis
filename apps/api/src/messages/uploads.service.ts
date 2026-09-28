import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  extname,
} from "path";

import {
  randomUUID,
} from "crypto";

import {
  ALLOWED_UPLOADS,
  AllowedUploadKind,
} from "./uploads/allowed-file-types";

@Injectable()
export class UploadsService {
  validateFile(
    file: Express.Multer.File,
  ): AllowedUploadKind {
    if (!file) {
      throw new BadRequestException(
        "No file uploaded",
      );
    }

    const extension =
      extname(
        file.originalname,
      ).toLowerCase();

    const entry =
      Object.entries(
        ALLOWED_UPLOADS,
      ).find(
        ([, config]) =>
          config.mimeTypes.includes(
            file.mimetype as never,
          ) &&
          config.extensions.includes(
            extension as never,
          ),
      );

    if (!entry) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype} (${extension})`,
      );
    }

    const [
      kind,
      config,
    ] = entry as [
      AllowedUploadKind,
      (typeof ALLOWED_UPLOADS)[AllowedUploadKind],
    ];

    if (
      file.size >
      config.maxSize
    ) {
      throw new BadRequestException(
        "File exceeds the maximum allowed size",
      );
    }

    return kind;
  }

  buildAttachment(
    file: Express.Multer.File,
    kind: AllowedUploadKind,
  ) {
    const publicPrefix =
      (
        process.env.PUBLIC_API_URL ||
        "http://localhost:3000"
      ).replace(/\/+$/, "");

    const url =
      `${publicPrefix}/uploads/messages/${file.filename}`;

    return {
      id: randomUUID(),

      kind,

      url,

      name:
        file.originalname,

      size:
        file.size,

      mimeType:
        file.mimetype,
    };
  }
}