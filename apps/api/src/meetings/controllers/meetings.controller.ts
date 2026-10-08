import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import { Public } from "../../auth/public.decorator";

import {
  MeetingsService,
} from "../services/meetings.service";

import {
  LiveTokenService,
} from "../../my-live/services/live-token.service";

import {
  CreateMeetingDto,
} from "../dto/create-meeting.dto";

import {
  UpdateMeetingDto,
} from "../dto/update-meeting.dto";

import {
  JoinMeetingDto,
} from "../dto/join-meeting.dto";

import {
  UpdateMeetingSettingsDto,
} from "../dto/update-meeting-settings.dto";

import {
  SendMeetingMessageDto,
} from "../dto/send-meeting-message.dto";

import {
  CreateReactionDto,
} from "../dto/create-reaction.dto";

@Controller("meetings")
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly liveTokenService: LiveTokenService,
  ) {}

  /* ==========================================================================
   * AUTH USER
   * ======================================================================== */

  private getUser(req: Request): {
    id: string;
    name: string;
  } {
    const user: any = (req as any).user;

    const id =
      user?.id ||
      user?.userId ||
      user?.sub;

    const name =
      user?.displayName ||
      user?.username ||
      user?.name ||
      user?.email ||
      "Fockis User";

    if (!id) {
      throw new Error(
        "Authenticated user ID is missing",
      );
    }

    return {
      id: String(id),
      name: String(name),
    };
  }

  /* ==========================================================================
   * SCHEDULED / LISTS
   * ======================================================================== */

  @Get("upcoming")
  listUpcoming(
    @Req() req: Request,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.listUpcoming(
      user.id,
    );
  }

  @Get("today")
  listToday(
    @Req() req: Request,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.listToday(
      user.id,
    );
  }

  @Get("recent")
  listRecent(
    @Req() req: Request,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.listRecent(
      user.id,
    );
  }

  /* ==========================================================================
   * INVITATIONS
   * ======================================================================== */

  @Get("invitations")
  listInvitations(
    @Req() req: Request,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.listInvitations(
      user.id,
    );
  }

  /* ==========================================================================
   * SECURE JOIN LINK
   * ======================================================================== */

  @Public()
  @Get("join-link/:joinToken")
  resolveJoinLink(
    @Param("joinToken") joinToken: string,
  ) {
    return this.meetingsService.resolveJoinToken(
      joinToken,
    );
  }

  /* ==========================================================================
   * ACCEPT INVITATION
   * ======================================================================== */

  @Post(":meetingId/invitation/accept")
  acceptInvitation(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.acceptInvitation(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * DECLINE INVITATION
   * ======================================================================== */

  @Post(":meetingId/invitation/decline")
  declineInvitation(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.declineInvitation(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * CREATE / SCHEDULE MEETING
   * ======================================================================== */

  @Post()
  create(
    @Req() req: Request,
    @Body() dto: CreateMeetingDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.create(
      user.id,
      user.name,
      dto,
    );
  }

  /* ==========================================================================
   * SINGLE MEETING
   * ======================================================================== */

  @Get(":meetingId")
  get(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.getById(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * UPDATE
   * ======================================================================== */

  @Patch(":meetingId")
  update(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.update(
      meetingId,
      user.id,
      dto,
    );
  }

  /* ==========================================================================
   * CANCEL
   * ======================================================================== */

  @Delete(":meetingId")
  cancel(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.cancel(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * START
   * ======================================================================== */

  @Post(":meetingId/start")
  start(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.start(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * END
   * ======================================================================== */

  @Post(":meetingId/end")
  end(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.end(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * JOIN
   * ======================================================================== */

  @Post(":meetingId/join")
  join(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body() dto: JoinMeetingDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.join(
      meetingId,
      user.id,
      user.name,
      dto.passcode,
    );
  }

  /* ==========================================================================
   * LIVEKIT MEDIA TOKEN
   *
   * POST /meetings/:meetingId/media-token
   *
   * Gives an admitted meeting participant a LiveKit token
   * for actual camera and microphone media.
   *
   * Socket.IO continues to handle:
   * - waiting room
   * - admission
   * - chat
   * - reactions
   * - participant state
   * - hand raising
   * - meeting events
   *
   * LiveKit handles the actual audio/video transport.
   * ======================================================================== */

  @Post(":meetingId/media-token")
  async createMediaToken(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    const meeting =
      await this.meetingsService.getById(
        meetingId,
        user.id,
      );

    if (!meeting) {
      throw new ForbiddenException(
        "Meeting was not found.",
      );
    }

    const meetingStatus =
      String(
        (meeting as any).status || "",
      ).toLowerCase();

    if (
      meetingStatus === "ended" ||
      meetingStatus === "cancelled"
    ) {
      throw new ForbiddenException(
        "This meeting is no longer active.",
      );
    }

    const participants =
      Array.isArray(
        (meeting as any).participants,
      )
        ? (meeting as any).participants
        : [];

    const participant =
      participants.find(
        (item: any) =>
          String(item?.userId) ===
          String(user.id),
      );

    if (!participant) {
      throw new ForbiddenException(
        "You are not a participant in this meeting.",
      );
    }

    /*
     * Do not issue a LiveKit token to someone
     * who is still waiting for host admission.
     */
    if (
      participant.waiting === true &&
      participant.admitted !== true
    ) {
      throw new ForbiddenException(
        "You must be admitted to the meeting before joining video.",
      );
    }

    if (participant.admitted !== true) {
      throw new ForbiddenException(
        "You have not been admitted to this meeting.",
      );
    }

    const roomName =
      String(
        (meeting as any).liveRoomName ||
          `fockis-meeting-${meetingId}`,
      ).trim();

    if (!roomName) {
      throw new ForbiddenException(
        "Live meeting room is not configured.",
      );
    }

    const serverUrl =
      (
        process.env.LIVEKIT_URL ||
        process.env.LIVEKIT_SERVER_URL ||
        ""
      ).trim();

    if (!serverUrl) {
      throw new Error(
        "LIVEKIT_URL is not configured.",
      );
    }

    const token =
      await this.liveTokenService.createToken({
        userId: user.id,
        userName: user.name,
        roomName,
        canPublish: true,
        canSubscribe: true,
      });

    return {
      token,
      serverUrl,
      roomName,
      meetingId: String(meetingId),
    };
  }

  /* ==========================================================================
   * HOST — ADMIT PARTICIPANT
   * ======================================================================== */

  @Post(":meetingId/participants/:participantId/admit")
  admitParticipant(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Param("participantId") participantId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.admitParticipant(
      meetingId,
      user.id,
      participantId,
    );
  }

  /* ==========================================================================
   * HOST — REJECT PARTICIPANT
   * ======================================================================== */

  @Post(":meetingId/participants/:participantId/reject")
  rejectParticipant(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Param("participantId") participantId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.rejectParticipant(
      meetingId,
      user.id,
      participantId,
    );
  }

  /* ==========================================================================
   * HOST — REMOVE INVITATION
   * ======================================================================== */

  @Delete(":meetingId/participants/:participantId/invitation")
  removeInvitation(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Param("participantId") participantId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.removeInvitation(
      meetingId,
      user.id,
      participantId,
    );
  }

  /* ==========================================================================
   * SETTINGS
   * ======================================================================== */

  @Patch(":meetingId/settings")
  updateSettings(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body() dto: UpdateMeetingSettingsDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.updateSettings(
      meetingId,
      user.id,
      dto,
    );
  }

  /* ==========================================================================
   * PARTICIPANTS
   * ======================================================================== */

  @Get(":meetingId/participants")
  participants(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.getParticipants(
      meetingId,
      user.id,
    );
  }

  /* ==========================================================================
   * CHAT
   * ======================================================================== */

  @Get(":meetingId/messages")
  messages(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.getMessages(
      meetingId,
      user.id,
    );
  }

  @Post(":meetingId/messages")
  sendMessage(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body() dto: SendMeetingMessageDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.addMessage(
      meetingId,
      user.id,
      user.name,
      dto,
    );
  }

  /* ==========================================================================
   * REACTIONS
   * ======================================================================== */

  @Post(":meetingId/reactions")
  reaction(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body() dto: CreateReactionDto,
  ) {
    const user = this.getUser(req);

    return this.meetingsService.addReaction(
      meetingId,
      user.id,
      dto,
    );
  }
}