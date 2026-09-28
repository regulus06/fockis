import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { Request } from "express";

import { FriendsService } from "../services/friends.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

/* ============================================================================
   AUTHENTICATED REQUEST
============================================================================ */

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    _id?: string;
    sub?: string;
  };
}

/* ============================================================================
   REQUEST BODY
============================================================================ */

interface RespondBody {
  accept: boolean;
}

/* ============================================================================
   FRIENDS CONTROLLER
============================================================================ */

@Controller("friends")
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
  ) {}

  /* ==========================================================================
     AUTHENTICATED USER ID
  ========================================================================== */

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const userId =
      req.user?.sub ??
      req.user?.id ??
      req.user?._id;

    if (!userId) {
      throw new UnauthorizedException(
        "User id missing from token",
      );
    }

    return String(userId);
  }

  /* ==========================================================================
     SEND FRIEND REQUEST

     Primary:
       POST /friends/request

     Compatibility:
       POST /friends/requests/:userId
  ========================================================================== */

  @Post("request")
  async sendRequestLegacy(
    @Req() req: AuthenticatedRequest,
    @Body() body: { friendId?: string; userId?: string },
  ) {
    const targetUserId =
      body?.friendId ??
      body?.userId;

    if (!targetUserId) {
      return this.friendsService.sendRequest(
        this.getUserId(req),
        "",
      );
    }

    return this.friendsService.sendRequest(
      this.getUserId(req),
      String(targetUserId),
    );
  }

  @Post("requests/:userId")
  async sendRequest(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.friendsService.sendRequest(
      this.getUserId(req),
      userId,
    );
  }

  /* ==========================================================================
     ACCEPT FRIEND REQUEST

     PATCH /friends/:id/accept
  ========================================================================== */

  @Patch(":id/accept")
  async acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.friendsService.acceptRequest(
      id,
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     REJECT FRIEND REQUEST

     PATCH /friends/:id/reject
  ========================================================================== */

  @Patch(":id/reject")
  async rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.friendsService.rejectRequest(
      id,
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     RESPOND TO FRIEND REQUEST

     Compatibility:
       POST /friends/:id/respond
       PATCH /friends/:id/respond
  ========================================================================== */

  @Post(":id/respond")
  async respondPost(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: RespondBody,
  ) {
    return this.friendsService.respondRequest(
      id,
      this.getUserId(req),
      Boolean(body?.accept),
    );
  }

  @Patch(":id/respond")
  async respondPatch(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: RespondBody,
  ) {
    return this.friendsService.respondRequest(
      id,
      this.getUserId(req),
      Boolean(body?.accept),
    );
  }

  /* ==========================================================================
     CANCEL SENT FRIEND REQUEST

     DELETE /friends/:id/cancel
  ========================================================================== */

  @Delete(":id/cancel")
  async cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.friendsService.cancelRequest(
      id,
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     REMOVE FRIEND

     Primary:
       DELETE /friends/:id/unfriend

     Compatibility:
       DELETE /friends/:userId
  ========================================================================== */

  @Delete(":id/unfriend")
  async unfriend(
    @Req() req: AuthenticatedRequest,
    @Param("id") friendId: string,
  ) {
    return this.friendsService.removeFriend(
      this.getUserId(req),
      friendId,
    );
  }

  @Delete(":userId")
  async removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.friendsService.removeFriend(
      this.getUserId(req),
      userId,
    );
  }

  /* ==========================================================================
     BLOCK USER

     POST /friends/:userId/block
  ========================================================================== */

  @Post(":userId/block")
  async block(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.friendsService.blockUser(
      this.getUserId(req),
      userId,
    );
  }

  /* ==========================================================================
     UNBLOCK USER

     DELETE /friends/:userId/block
  ========================================================================== */

  @Delete(":userId/block")
  async unblock(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.friendsService.unblockUser(
      this.getUserId(req),
      userId,
    );
  }

  /* ==========================================================================
     MY FRIENDS

     GET /friends
  ========================================================================== */

  @Get()
  async myFriends(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getFriends(
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     INCOMING FRIEND REQUESTS

     Primary:
       GET /friends/requests

     Explicit:
       GET /friends/requests/pending
       GET /friends/requests/incoming
  ========================================================================== */

  @Get("requests")
  async requests(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getPendingRequests(
      this.getUserId(req),
    );
  }

  @Get("requests/pending")
  async pending(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getPendingRequests(
      this.getUserId(req),
    );
  }

  @Get("requests/incoming")
  async incoming(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getPendingRequests(
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     OUTGOING / SENT FRIEND REQUESTS

     Primary:
       GET /friends/requests/outgoing

     Explicit:
       GET /friends/requests/sent
  ========================================================================== */

  @Get("requests/outgoing")
  async outgoing(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getSentRequests(
      this.getUserId(req),
    );
  }

  @Get("requests/sent")
  async sent(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getSentRequests(
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     BLOCKED USERS

     GET /friends/blocked
  ========================================================================== */

  @Get("blocked")
  async blocked(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.friendsService.getBlockedUsers(
      this.getUserId(req),
    );
  }

  /* ==========================================================================
     FRIEND STATUS

     GET /friends/status/:userId
  ========================================================================== */

  @Get("status/:userId")
  async status(
    @Req() req: AuthenticatedRequest,
    @Param("userId") userId: string,
  ) {
    return this.friendsService.getFriendStatus(
      this.getUserId(req),
      userId,
    );
  }

  /* ==========================================================================
     SEARCH USERS

     GET /friends/search/:query
  ========================================================================== */

  @Get("search/:query")
  async search(
    @Param("query") query: string,
  ) {
    return this.friendsService.searchFriends(
      query,
    );
  }

  /* ==========================================================================
     PEOPLE YOU MAY KNOW

     GET /friends/suggestions
  ========================================================================== */

  @Get("suggestions")
  async suggestions(
    @Req() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ) {
    /*
     * The service currently owns the suggestion filtering logic.
     * Keep the query parameter for frontend compatibility.
     */
    const suggestions =
      await this.friendsService.suggestions(
        this.getUserId(req),
      );

    const parsedLimit = Number(limit);

    if (
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0
    ) {
      return suggestions.slice(
        0,
        Math.floor(parsedLimit),
      );
    }

    return suggestions;
  }

  /* ==========================================================================
     ANOTHER USER'S FRIENDS

     GET /friends/:userId

     This route is intentionally near the bottom so that routes such as
     /friends/requests, /friends/status/:userId, /friends/search/:query,
     /friends/suggestions, and /friends/blocked are matched first.
  ========================================================================== */

  @Get(":userId")
  async userFriends(
    @Param("userId") userId: string,
  ) {
    return this.friendsService.getFriends(
      userId,
    );
  }
}
