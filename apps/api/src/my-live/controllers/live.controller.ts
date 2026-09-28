import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { LiveJwtGuard } from "../guards/live-jwt.guard";

import { LiveService } from "../services/live.service";
import { LiveTokenService } from "../services/live-token.service";
import { LiveCommentService } from "../services/live-comment.service";
import { LiveDiscoveryService } from "../services/live-discovery.service";
import { LiveGuestService } from "../services/live-guest.service";

import {
  CreateLiveDto,
  LiveProductDto,
} from "../dto/create-live.dto";

import {
  InviteLiveGuestDto,
  RespondLiveGuestDto,
} from "../dto/live-guest.dto";

import { getUserId } from "../utils/live-room.util";

@Controller("live")
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly tokenService: LiveTokenService,
    private readonly commentService: LiveCommentService,
    private readonly discoveryService: LiveDiscoveryService,
    private readonly liveGuestService: LiveGuestService,
  ) {}

  @UseGuards(LiveJwtGuard)
  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateLiveDto,
  ) {
    const userId = getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Unable to determine authenticated user.",
      );
    }

    return this.liveService.create(
      userId,
      dto,
    );
  }

  @Get("public")
  async publicLiveStreams() {
    return this.discoveryService.discoverPublic();
  }

  @Get()
  async discover(
    @Query("category") category?: string,
  ) {
    return this.discoveryService.discover(
      category,
    );
  }

  @Get("trending")
  async trending() {
    return this.discoveryService.trending();
  }

  @UseGuards(LiveJwtGuard)
  @Get("mine")
  async mine(
    @Req() req: any,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Unable to determine authenticated user.",
      );
    }

    return this.liveService.getMyLiveStreams(
      userId,
    );
  }

  /*
   * ============================================================================
   * GUESTS
   * ============================================================================
   */

  /**
   * Host invites a user to join
   * the current LIVE as a guest.
   *
   * POST /live/:id/guests/invite
   */
  @UseGuards(LiveJwtGuard)
  @Post(":id/guests/invite")
  async inviteGuest(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: InviteLiveGuestDto,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.invite(
      userId,
      id,
      dto,
    );
  }

  /**
   * Get guests/invitations for
   * a LIVE owned by the current host.
   *
   * GET /live/:id/guests
   */
  @UseGuards(LiveJwtGuard)
  @Get(":id/guests")
  async getGuests(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.getGuests(
      userId,
      id,
    );
  }

  /**
   * Get guest invitations received
   * by the current user.
   *
   * GET /live/guests/invitations
   *
   * IMPORTANT:
   * This route is intentionally above
   * /:id routes.
   */
  @UseGuards(LiveJwtGuard)
  @Get("guests/invitations")
  async getMyGuestInvitations(
    @Req() req: any,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.getMyInvitations(
      userId,
    );
  }

  /**
   * Guest accepts or declines
   * an invitation.
   *
   * POST /live/guests/:invitationId/respond
   */
  @UseGuards(LiveJwtGuard)
  @Post("guests/:invitationId/respond")
  async respondToGuestInvitation(
    @Req() req: any,
    @Param("invitationId")
    invitationId: string,
    @Body()
    dto: RespondLiveGuestDto,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.respond(
      userId,
      invitationId,
      dto.status,
    );
  }

  /**
   * Host removes a guest from
   * the LIVE.
   *
   * DELETE /live/:id/guests/:guestUserId
   */
  @UseGuards(LiveJwtGuard)
  @Delete(":id/guests/:guestUserId")
  async removeGuest(
    @Req() req: any,
    @Param("id") id: string,
    @Param("guestUserId")
    guestUserId: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.remove(
      userId,
      id,
      guestUserId,
    );
  }

  /**
   * Mark an accepted guest as
   * connected to the LIVE.
   *
   * POST /live/:id/guests/connect
   */
  @UseGuards(LiveJwtGuard)
  @Post(":id/guests/connect")
  async connectGuest(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.markConnected(
      userId,
      id,
    );
  }

  /**
   * Mark a guest as having left
   * the LIVE.
   *
   * POST /live/:id/guests/leave
   */
  @UseGuards(LiveJwtGuard)
  @Post(":id/guests/leave")
  async leaveGuest(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveGuestService.markLeft(
      userId,
      id,
    );
  }

  @Get(":id/comments")
  async comments(
    @Param("id") id: string,
  ) {
    return this.commentService.findLatest(
      id,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/comments")
  async createComment(
    @Req() req: any,
    @Param("id") id: string,
    @Body("message") message: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      throw new BadRequestException(
        "Message is required.",
      );
    }

    const comment =
      await this.commentService.create({
        streamId: id,
        userId,
        message:
          message.trim(),
        userName:
          req.user?.name ||
          req.user?.username ||
          "Fockis User",
        userAvatar:
          req.user?.avatar ||
          req.user?.avatarUrl ||
          "",
      });

    await this.liveService.incrementComment(
      id,
    );

    return comment;
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/join")
  async join(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    const stream =
      await this.liveService.findById(
        id,
      );

    if (
      stream.status !== "live"
    ) {
      throw new BadRequestException(
        "This LIVE stream is not currently live.",
      );
    }

    const isHost =
      String(stream.hostId) ===
      String(userId);

    /*
     * A guest is allowed to publish only
     * after accepting an invitation.
     */
    const guestInvitation =
      !isHost
        ? await this.liveGuestService
            .getGuestsForUser(
              userId,
              id,
            )
        : null;

    const isGuest =
      Boolean(
        guestInvitation,
      );

    const canPublish =
      isHost || isGuest;

    const token =
      await this.tokenService.createToken({
        userId,
        userName:
          req.user?.name ||
          req.user?.username ||
          "Fockis User",
        roomName:
          stream.roomName,
        canPublish,
        canSubscribe: true,
      });

    if (isGuest) {
      await this.liveGuestService.markConnected(
        userId,
        id,
      );
    }

    const updated =
      isHost || isGuest
        ? stream
        : await this.liveService.incrementViewer(
            id,
          );

    return {
      stream: updated,
      token,
      serverUrl:
        process.env.LIVEKIT_URL || "",
      role: isHost
        ? "host"
        : isGuest
          ? "guest"
          : "viewer",
      canPublish,
    };
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/leave")
  async leave(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    const stream =
      await this.liveService.findById(
        id,
      );

    const isHost =
      String(stream.hostId) ===
      String(userId);

    if (isHost) {
      return {
        viewerCount:
          stream.viewerCount,
        peakViewerCount:
          stream.peakViewerCount,
      };
    }

    /*
     * Guests should leave the guest
     * participation instead of being
     * counted as normal viewers.
     */
    const guest =
      await this.liveGuestService
        .getGuestsForUser(
          userId,
          id,
        );

    if (guest) {
      return this.liveGuestService.markLeft(
        userId,
        id,
      );
    }

    return this.liveService.decrementViewer(
      id,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/end")
  async end(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    const result =
      await this.liveService.end(
        userId,
        id,
      );

    await this.liveGuestService.endStream(
      id,
    );

    return result;
  }

  @UseGuards(LiveJwtGuard)
  @Delete(":id")
  async delete(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveService.delete(
      userId,
      id,
    );
  }

  @Post(":id/share")
  async share(
    @Param("id") id: string,
  ) {
    return this.liveService.incrementShare(
      id,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/like")
  async like(
    @Param("id") id: string,
    @Body("amount") amount?: number,
  ) {
    const normalizedAmount =
      amount === undefined
        ? 1
        : Number(amount);

    if (
      !Number.isFinite(
        normalizedAmount,
      ) ||
      normalizedAmount <= 0
    ) {
      throw new BadRequestException(
        "Like amount must be greater than zero.",
      );
    }

    return this.liveService.incrementLike(
      id,
      normalizedAmount,
    );
  }

  @Post(":id/comment-count")
  async commentCount(
    @Param("id") id: string,
  ) {
    return this.liveService.incrementComment(
      id,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/viewers")
  async setViewerCount(
    @Param("id") id: string,
    @Body("count") count: number,
  ) {
    const normalizedCount =
      Number(count);

    if (
      !Number.isFinite(
        normalizedCount,
      ) ||
      normalizedCount < 0
    ) {
      throw new BadRequestException(
        "Viewer count must be a non-negative number.",
      );
    }

    return this.liveService.setViewerCount(
      id,
      normalizedCount,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Post(":id/products")
  async addProduct(
    @Req() req: any,
    @Param("id") id: string,
    @Body() product: LiveProductDto,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveService.addProduct(
      userId,
      id,
      product,
    );
  }

  @UseGuards(LiveJwtGuard)
  @Delete(":id/products/:productId")
  async removeProduct(
    @Req() req: any,
    @Param("id") id: string,
    @Param("productId") productId: string,
  ) {
    const userId =
      getUserId(req.user);

    if (!userId) {
      throw new BadRequestException(
        "Authentication required.",
      );
    }

    return this.liveService.removeProduct(
      userId,
      id,
      productId,
    );
  }

  @Get(":id")
  async get(
    @Param("id") id: string,
  ) {
    return this.liveService.findById(
      id,
    );
  }
}