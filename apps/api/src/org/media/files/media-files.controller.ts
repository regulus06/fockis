/**
 * media-files.controller.ts
 * -----------------------------------------------------------------------------
 * GET /uploads/organization-media/:orgId/:name
 *
 * The static file server answers first when the file is on this server's
 * disk. When it is not (a new server, a restart on Render, or a file uploaded
 * from another server), this route streams the copy from Google Cloud
 * Storage. Byte ranges are supported, so videos and audio can seek.
 *
 * Same visibility as before: the static uploads folder was already public.
 * -----------------------------------------------------------------------------
 */

import { Controller, Get, NotFoundException, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { Public } from "../../../auth/public.decorator";
import { MediaStorageService, isValidMediaRef, parseRange } from "./media-storage.service";

@Public()
@Controller("uploads/organization-media")
export class MediaFilesController {
  constructor(private readonly storage: MediaStorageService) {}

  @Get(":orgId/:name")
  async file(
    @Param("orgId") orgId: string,
    @Param("name") name: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!isValidMediaRef(orgId, name)) throw new NotFoundException("File not found.");

    const info = await this.storage.info(orgId, name);

    if (!info) throw new NotFoundException("File not found.");

    res.setHeader("Content-Type", info.contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const range = parseRange(req.headers.range, info.size);

    if (range === "invalid") {
      res.setHeader("Content-Range", `bytes */${info.size}`);
      res.status(416).end();
      return;
    }

    if (range) {
      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
      res.setHeader("Content-Length", String(range.end - range.start + 1));
    } else {
      res.status(200);
      res.setHeader("Content-Length", String(info.size));
    }

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = this.storage.stream(orgId, name, range ?? undefined);

    stream.on("error", () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });

    req.on("close", () => stream.destroy());

    stream.pipe(res);
  }
}
