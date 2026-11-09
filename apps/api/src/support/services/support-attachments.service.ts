import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";

import { CloudStorageService } from "../../uploads/cloud-storage.service";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  HELP_IMAGE_MAX_BYTES,
  HELP_IMAGE_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "../support.constants";
import type { AttachmentRefDto } from "../dto/support.dto";

export interface UploadedSupportFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface StoredAttachment {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

/** Checks the first bytes so a renamed file can't pretend to be another type. */
function sniff(buffer: Buffer, mime: string): boolean {
  const head = buffer.subarray(0, 16);
  const ascii = head.toString("latin1");
  switch (mime) {
    case "image/png":
      return head[0] === 0x89 && ascii.slice(1, 4) === "PNG";
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/gif":
      return ascii.startsWith("GIF8");
    case "image/webp":
      return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
    case "application/pdf":
      return ascii.startsWith("%PDF");
    case "video/mp4":
    case "video/quicktime":
      return ascii.slice(4, 8) === "ftyp";
    case "video/webm":
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    case "text/plain":
      return !buffer.subarray(0, 4096).includes(0);
    default:
      return false;
  }
}

function cleanName(name: string | undefined, ext: string) {
  const base = String(name ?? "file").replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").trim().slice(0, 150) || "file";
  return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`;
}

/**
 * Private file handling for Help & Support. Files go to cloud storage under
 * a per-owner prefix and are only ever shared as 15-minute signed links.
 */
@Injectable()
export class SupportAttachmentsService {
  constructor(private readonly storage: CloudStorageService) {}

  /** support/u/<userId>/… for users, support/staff/<staffId>/… for agents. */
  static prefix(ownerId: string, staff = false) {
    return staff ? `support/staff/${ownerId}/` : `support/u/${ownerId}/`;
  }

  async upload(ownerId: string, file: UploadedSupportFile | undefined, staff = false): Promise<StoredAttachment> {
    if (!file?.buffer?.length) throw new BadRequestException("Choose a file to upload.");
    const ext = ATTACHMENT_TYPES[file.mimetype];
    if (!ext) throw new BadRequestException("Attach an image (PNG, JPG, GIF, WebP), a video (MP4, WebM, MOV), a PDF or a text file.");
    if (file.size > ATTACHMENT_MAX_BYTES) throw new BadRequestException("Files can be up to 25 MB.");
    if (!sniff(file.buffer, file.mimetype)) throw new BadRequestException("That file's contents don't match its type.");

    const key = `${SupportAttachmentsService.prefix(ownerId, staff)}${randomUUID()}${ext}`;
    await this.storage.uploadBuffer(file.buffer, key, file.mimetype);
    return { key, name: cleanName(file.originalname, ext), mimeType: file.mimetype, size: file.size };
  }

  /** Only accepts files the same person uploaded. */
  assertOwned(ownerId: string, attachments: AttachmentRefDto[] | undefined, staff = false): StoredAttachment[] {
    const list = attachments ?? [];
    if (list.length > MAX_ATTACHMENTS_PER_MESSAGE) throw new BadRequestException(`Attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files.`);
    const prefix = SupportAttachmentsService.prefix(ownerId, staff);
    return list.map((a) => {
      if (!a.key.startsWith(prefix) || a.key.includes("..") || !ATTACHMENT_TYPES[a.mimeType]) {
        throw new BadRequestException("One of the attachments wasn't uploaded by you. Upload it again.");
      }
      return { key: a.key, name: cleanName(a.name, ATTACHMENT_TYPES[a.mimeType]), mimeType: a.mimeType, size: a.size };
    });
  }

  /** Signed link for a file that is part of the given record. */
  async link(allowed: StoredAttachment[], key: string) {
    const file = allowed.find((a) => a.key === key);
    if (!file) throw new NotFoundException("That file was not found.");
    const safe = file.name.replace(/["\\\r\n]/g, "");
    const url = await this.storage.getSignedUrl(file.key, {
      expiresInSeconds: 15 * 60,
      responseDisposition: `inline; filename="${safe}"`,
    });
    return { url, name: file.name, mimeType: file.mimeType };
  }

  /** Public Help Center image; served by the existing /uploads/media route. */
  async uploadHelpImage(file: UploadedSupportFile | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException("Choose an image to upload.");
    if (!HELP_IMAGE_TYPES.includes(file.mimetype)) throw new BadRequestException("Upload a PNG, JPG, GIF or WebP image.");
    if (file.size > HELP_IMAGE_MAX_BYTES) throw new BadRequestException("Images can be up to 5 MB.");
    if (!sniff(file.buffer, file.mimetype)) throw new BadRequestException("That file's contents don't match its type.");
    const key = `help/images/${randomUUID()}${ATTACHMENT_TYPES[file.mimetype]}`;
    await this.storage.uploadBuffer(file.buffer, key, file.mimetype);
    return { url: `/uploads/media/${key}` };
  }
}
