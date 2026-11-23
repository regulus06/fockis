/**
 * media-files.controller.ts
 * -----------------------------------------------------------------------------
 * GET /uploads/organization-media/:orgId/:name
 *
 * The static file server answers first when the file is on this server's
 * disk. When it is not (a new server, a restart on Render, or a file uploaded
 * from another server), this route redirects to a short-lived signed link to
 * the copy in Google Cloud Storage. Browsers follow the redirect for images,
 * <video> and <audio> (including range requests for seeking).
 *
 * Same visibility as before: the static uploads folder was already public.
 * -----------------------------------------------------------------------------
 */

import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";

import { Public } from "../../../auth/public.decorator";
import { MediaStorageService, isValidMediaRef } from "./media-storage.service";

@Public()
@Controller("uploads/organization-media")
export class MediaFilesController {
  constructor(private readonly storage: MediaStorageService) {}

  @Get(":orgId/:name")
  async file(@Param("orgId") orgId: string, @Param("name") name: string, @Res() res: Response) {
    if (!isValidMediaRef(orgId, name)) throw new NotFoundException("File not found.");

    const url = await this.storage.signedUrl(orgId, name);

    if (!url) throw new NotFoundException("File not found.");

    // The link expires in an hour; let browsers reuse the redirect briefly.
    res.setHeader("Cache-Control", "private, max-age=600");
    res.redirect(302, url);
  }
}
