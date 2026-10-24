import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { LiveJwtGuard } from "../guards/live-jwt.guard";

import { LiveRecordingService } from "../services/live-recording.service";

import { PublishRecordingDto } from "../dto/publish-recording.dto";

import { getUserId } from "../utils/live-room.util";

/**
 * Recording routes for ended LIVE streams.
 *
 *   GET    /live/:id/recording            details + signed playback URL (owner)
 *   GET    /live/:id/recording/download   short-lived signed download URL (owner)
 *   POST   /live/:id/recording/start      (re)start recording while live (owner)
 *   POST   /live/:id/recording/publish    publish to the Fockis feed (owner)
 *   DELETE /live/:id/recording            delete the recording file (owner)
 *   POST   /live/recordings/webhook       LiveKit webhook (signature verified)
 */
@Controller("live")
export class LiveRecordingController {
  constructor(
    private readonly recordingService: LiveRecordingService,
  ) {}

  private requireUser(req: any): string {
    const userId = getUserId(req.user);

    if (!userId) {
      throw new BadRequestException("Authentication required.");
    }

    return userId;
  }

  // ==========================================================================
  // LIVEKIT WEBHOOK
  // ==========================================================================

  /**
   * LiveKit posts `application/webhook+json`, which the global JSON
   * parser does not consume, so the untouched raw body is read here and
   * verified against the signed Authorization header.
   */
  @Post("recordings/webhook")
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers("authorization") authorization?: string,
  ) {
    const raw = await readRawBody(req);

    if (!raw) {
      throw new BadRequestException("Empty webhook body.");
    }

    return this.recordingService.handleWebhook(raw, authorization);
  }

  // ==========================================================================
  // OWNER ROUTES
  // ==========================================================================

  @UseGuards(LiveJwtGuard)
  @Get(":id/recording")
  async details(@Req() req: any, @Param("id") id: string) {
    return this.recordingService.getDetails(this.requireUser(req), id);
  }

  @UseGuards(LiveJwtGuard)
  @Get(":id/recording/download")
  async download(@Req() req: any, @Param("id") id: string) {
    return this.recordingService.getDownload(this.requireUser(req), id);
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/recording/start")
  async start(@Req() req: any, @Param("id") id: string) {
    return this.recordingService.ensureStarted(this.requireUser(req), id);
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/recording/publish")
  async publish(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: PublishRecordingDto,
  ) {
    return this.recordingService.publishToFeed(
      this.requireUser(req),
      id,
      dto?.caption,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Delete(":id/recording")
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.recordingService.deleteRecording(this.requireUser(req), id);
  }
}

async function readRawBody(req: any): Promise<string> {
  if (Buffer.isBuffer(req?.rawBody) && req.rawBody.length) {
    return req.rawBody.toString("utf8");
  }

  if (typeof req?.body === "string" && req.body) {
    return req.body;
  }

  if (Buffer.isBuffer(req?.body) && req.body.length) {
    return req.body.toString("utf8");
  }

  if (req?.readableEnded) {
    return "";
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;

      if (size > 1024 * 1024) {
        reject(new BadRequestException("Webhook body too large."));
        req.destroy?.();
        return;
      }

      chunks.push(Buffer.from(chunk));
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
