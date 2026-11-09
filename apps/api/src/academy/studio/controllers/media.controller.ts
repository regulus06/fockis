import { Controller, Get, Headers, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";

import { CloudStorageService } from "../../../uploads/cloud-storage.service";
import { readMediaToken } from "../media-link";

/**
 * GET /academy/learn/media/:token
 *
 * Streams a lesson file the API already allowed this person to open (see
 * media-link.ts). Supports HTTP Range so videos can seek and PDFs load
 * progressively. No sign-in header is needed: <video> and <iframe> can't send
 * one, so the signed, expiring token is the permission.
 */
@Controller("academy/learn/media")
export class AcademyMediaController {
  constructor(private readonly storage: CloudStorageService) {}

  @Get(":token")
  async stream(@Param("token") token: string, @Headers("range") range: string | undefined, @Res() res: Response) {
    const grant = readMediaToken(token);
    if (!grant) throw new NotFoundException("This link has expired. Reload the lesson to get a new one.");

    const info = await this.storage.getObjectInfo(grant.k).catch(() => null);
    if (!info) throw new NotFoundException("This file is no longer available.");
    const size = info.size;

    let start = 0;
    let end = size > 0 ? size - 1 : 0;
    let partial = false;
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range || "").trim());
    if (m && size > 0) {
      if (m[1] === "" && m[2] !== "") {
        start = Math.max(0, size - Number(m[2]));
      } else {
        start = Number(m[1] || 0);
        if (m[2] !== "") end = Math.min(Number(m[2]), size - 1);
      }
      if (start > end || start >= size) {
        res.status(416).setHeader("Content-Range", `bytes */${size}`);
        res.end();
        return;
      }
      partial = true;
    }

    // Shown inside the classroom page, which may be on another Fockis host.
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Type", grant.m || info.contentType || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const encoded = encodeURIComponent(grant.n);
    res.setHeader("Content-Disposition", `${grant.d ? "attachment" : "inline"}; filename="${grant.n.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encoded}`);
    if (partial) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    } else {
      res.status(200);
    }
    res.setHeader("Content-Length", String(size === 0 ? 0 : end - start + 1));

    if (size === 0) {
      res.end();
      return;
    }

    const stream = this.storage.openReadStream(grant.k, partial ? { start, end } : undefined);
    stream.on("error", (err) => {
      console.error("[ACADEMY MEDIA] Stream failed:", err?.message ?? err);
      if (!res.headersSent) res.status(502).end();
      else res.destroy();
    });
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  }
}
