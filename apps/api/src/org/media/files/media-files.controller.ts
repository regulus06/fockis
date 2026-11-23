/**
 * media-files.controller.ts
 * -----------------------------------------------------------------------------
 * GET /uploads/<path>
 *
 * The static file server (main.ts) answers first when the file is on this
 * server's disk. When it is not (a new server, a restart or deploy on Render,
 * or a file uploaded from another machine that shares the database), this
 * route streams the copy from Google Cloud Storage:
 *
 *   /uploads/organization-media/<orgId>/<name>  → media-storage.service
 *   any other public upload folder              → uploads-mirror.service
 *
 * Byte ranges are supported, so videos and audio can seek. Visibility is the
 * same as the static uploads folder (public); private/excluded folders
 * (music, documents, scans, …) are never served here. Anything this route
 * does not serve is passed on (next()), so other /uploads/* routes such as
 * GET /uploads/media/* keep working and unknown files still get a 404.
 * -----------------------------------------------------------------------------
 */

import { Controller, Get, Next, Param, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Readable } from "stream";

import { Public } from "../../../auth/public.decorator";
import { MediaStorageService, isValidMediaRef, parseRange } from "./media-storage.service";
import { UploadsMirrorService, normalizeUploadPath } from "./uploads-mirror.service";

@Public()
@Controller("uploads")
export class MediaFilesController {
  constructor(
    private readonly storage: MediaStorageService,
    private readonly mirror: UploadsMirrorService,
  ) {}

  @Get("*path")
  async file(
    @Param("path") rawPath: string | string[],
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const segments = (Array.isArray(rawPath) ? rawPath : String(rawPath ?? "").split("/")).filter(Boolean);

    // Organization media library.
    if (segments[0] === "organization-media" && segments.length === 3) {
      const [, orgId, name] = segments;

      if (!isValidMediaRef(orgId, name)) return next();

      const info = await this.storage.info(orgId, name);
      if (!info) return next();

      return this.send(req, res, info, (range) => this.storage.stream(orgId, name, range));
    }

    // Every other public upload folder.
    const path = normalizeUploadPath(segments);
    if (!path) return next();

    const info = await this.mirror.info(path);
    if (!info) return next();

    return this.send(req, res, info, (range) => this.mirror.stream(path, range));
  }

  private send(
    req: Request,
    res: Response,
    info: { size: number; contentType: string },
    open: (range?: { start: number; end: number }) => Readable,
  ): void {
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

    const stream = open(range ?? undefined);

    stream.on("error", () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });

    req.on("close", () => stream.destroy());

    stream.pipe(res);
  }
}
