import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from "@nestjs/common";

import {

  InjectModel,

} from "@nestjs/mongoose";

import {

  Model,

  Types,

} from "mongoose";

import {

  randomBytes,

} from "crypto";

import {

  Meeting,

  MeetingDocument,

} from "../schemas/meeting.schema";

import {

  MeetingParticipant,

} from "../schemas/meeting-participant.schema";

import {

  MeetingAgenda,

} from "../schemas/meeting-agenda.schema";

import {

  MeetingMessage,

} from "../schemas/meeting-message.schema";

import {

  MeetingReaction,

} from "../schemas/meeting-reaction.schema";

import {

  CreateMeetingDto,

} from "../dto/create-meeting.dto";

import {

  UpdateMeetingDto,

} from "../dto/update-meeting.dto";

import {

  UpdateMeetingSettingsDto,

} from "../dto/update-meeting-settings.dto";

import {

  SendMeetingMessageDto,

} from "../dto/send-meeting-message.dto";

import {

  CreateReactionDto,

} from "../dto/create-reaction.dto";

@Injectable()

export class MeetingsService {

  constructor(

    @InjectModel(Meeting.name)

    private readonly meetingModel: Model<MeetingDocument>,

    @InjectModel(MeetingParticipant.name)

    private readonly participantModel: Model<MeetingParticipant>,

    @InjectModel(MeetingAgenda.name)

    private readonly agendaModel: Model<MeetingAgenda>,

    @InjectModel(MeetingMessage.name)

    private readonly messageModel: Model<MeetingMessage>,

    @InjectModel(MeetingReaction.name)

    private readonly reactionModel: Model<MeetingReaction>,

  ) {}

  /* ==========================================================================

   * HELPERS

   * ======================================================================== */

  private userId(id: string): Types.ObjectId {

    if (!id || !Types.ObjectId.isValid(id)) {

      throw new BadRequestException(

        "Invalid user ID",

      );

    }

    return new Types.ObjectId(id);

  }

  private meetingObjectId(

    id: string,

  ): Types.ObjectId {

    if (!id || !Types.ObjectId.isValid(id)) {

      throw new BadRequestException(

        "Invalid meeting ID",

      );

    }

    return new Types.ObjectId(id);

  }

  /**

   * Resolve a meeting reference from a Mongo ObjectId, human meeting code,

   * secure join token, /meet/<token>, or a full Fockis meeting URL.

   */

  private async findMeetingByReference(

    reference: string,

  ) {

    const value = reference?.trim();

    if (!value) {

      throw new BadRequestException(

        "Meeting ID or join link is required",

      );

    }

    if (Types.ObjectId.isValid(value)) {

      const byId = await this.meetingModel.findById(

        new Types.ObjectId(value),

      );

      if (byId) {

        return byId;

      }

    }

    const compactCode = value.replace(/\s+/g, "");

    if (/^\d{9}$/.test(compactCode)) {

      const byCode = await this.meetingModel.findOne({

        $or: [

          { meetingCode: value },

          { meetingCode: compactCode },

        ],

      });

      if (byCode) {

        return byCode;

      }

    }

    let token = value;

    try {

      if (

        token.startsWith("http\\://") ||

        token.startsWith("https\\://")

      ) {

        const url = new URL(token);

        token = url.pathname;

      }

      token = token

        .replace(/^\/+/, "")

        .replace(/^meet\/+/, "")

        .split("/")[0]

        .trim();

    } catch {

      token = token

        .replace(/^\/+/, "")

        .replace(/^meet\/+/, "")

        .split("/")[0]

        .trim();

    }

    if (token) {

      const byToken = await this.meetingModel.findOne({

        joinToken: token,

      });

      if (byToken) {

        return byToken;

      }

    }

    throw new NotFoundException(

      "Meeting not found",

    );

  }

  private generateMeetingCode(): string {

    const digits = Math.floor(

      100000000 +

        Math.random() * 900000000,

    ).toString();

    return `${digits.slice(

      0,

      3,

    )} ${digits.slice(

      3,

      6,

    )} ${digits.slice(6)}`;

  }

  private generateJoinToken(): string {

    return randomBytes(18).toString(

      "base64url",

    );

  }

  private normalizeMeeting(

    meeting: any,

  ) {

    const object =

      meeting?.toObject

        ? meeting.toObject()

        : meeting;

    return {

      ...object,

      id:

        meeting?._id?.toString(),

      hostId:

        meeting?.hostId?.toString(),

      joinLink:

        `/meet/${meeting?.joinToken}`,

    };

  }

  /* ==========================================================================

   * SECURE JOIN LINK

   *

   * Resolves a public Fockis join token to the actual meeting ID.

   *

   * This endpoint intentionally returns only the information needed by the

   * join flow. It does not call getById(), because getById() correctly

   * requires the authenticated user to already be a meeting participant.

   * ======================================================================== */

  async resolveJoinToken(joinToken: string) {

    const value = joinToken?.trim();

    if (!value) {

      throw new BadRequestException(

        "Meeting join token is required",

      );

    }

    let token = value;

    try {

      if (

        token.startsWith("http\\://") ||

        token.startsWith("https\\://")

      ) {

        const url = new URL(token);

        token = url.pathname;

      }

      token = token

        .replace(/^\/+/, "")

        .replace(/^meet\/+/, "")

        .split("/")[0]

        .trim();

    } catch {

      token = token

        .replace(/^\/+/, "")

        .replace(/^meet\/+/, "")

        .split("/")[0]

        .trim();

    }

    const meeting = await this.meetingModel.findOne({

      joinToken: token,

    });

    if (!meeting) {

      throw new NotFoundException(

        "Meeting link is invalid or no longer exists",

      );

    }

    if (meeting.status === "cancelled") {

      throw new BadRequestException(

        "This meeting has been cancelled",

      );

    }

    if (meeting.status === "ended") {

      throw new BadRequestException(

        "This meeting has ended",

      );

    }

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      meetingCode:

        meeting.meetingCode,

      topic:

        meeting.topic,

      description:

        meeting.description,

      hostName:

        meeting.hostName,

      startTime:

        meeting.startTime,

      endTime:

        meeting.endTime,

      durationMinutes:

        meeting.durationMinutes,

      timezone:

        meeting.timezone,

      visibility:

        meeting.visibility ?? "private",

      requireApproval:

        meeting.requireApproval ?? true,

      allowGuests:

        meeting.allowGuests ?? false,

      maxParticipants:

        meeting.maxParticipants,

      status:

        meeting.status,

      hasPasscode:

        Boolean(meeting.passcode),

      security: {

        waitingRoomEnabled:

          meeting.security?.waitingRoomEnabled ??

          true,

        allowJoinBeforeHost:

          meeting.security?.allowJoinBeforeHost ??

          false,

        muteParticipantsOnEntry:

          meeting.security?.muteParticipantsOnEntry ??

          true,

      },

      joinLink:

        `/meet/${meeting.joinToken}`,

    };

  }

  /* ==========================================================================

   * CREATE / SCHEDULE MEETING

   * ======================================================================== */

  async create(

    userId: string,

    userName: string,

    dto: CreateMeetingDto,

  ) {

    if (!dto.topic?.trim()) {

      throw new BadRequestException(

        "Meeting topic is required",

      );

    }

    if (!dto.startTime) {

      throw new BadRequestException(

        "Meeting start time is required",

      );

    }

    if (

      !dto.durationMinutes ||

      dto.durationMinutes <= 0

    ) {

      throw new BadRequestException(

        "Meeting duration must be greater than zero",

      );

    }

    const hostObjectId =

      this.userId(userId);

    const startTime =

      new Date(dto.startTime);

    if (

      Number.isNaN(

        startTime.getTime(),

      )

    ) {

      throw new BadRequestException(

        "Invalid meeting start time",

      );

    }

    if (

      startTime.getTime() <=

      Date.now()

    ) {

      throw new BadRequestException(

        "Meeting start time must be in the future",

      );

    }

    const endTime =

      new Date(

        startTime.getTime() +

          dto.durationMinutes *

            60 *

            1000,

      );

    /*

     * Remove duplicate invitees.

     */

    const inviteeIds =

      Array.from(

        new Set(

          dto.inviteeIds || [],

        ),

      );

    const inviteeObjectIds =

      inviteeIds.map(

        (id) =>

          this.userId(id),

      );

    /*

     * Never invite the host.

     */

    const filteredInviteeIds =

      inviteeObjectIds.filter(

        (id) =>

          id.toString() !==

          hostObjectId.toString(),

      );

    /* ------------------------------------------------------------------------

     * CREATE MEETING

     * ---------------------------------------------------------------------- */

    const meeting =

      await this.meetingModel.create({

        topic:

          dto.topic.trim(),

        description:

          dto.description?.trim(),

        hostId:

          hostObjectId,

        hostName:

          userName,

        date:

          startTime

            .toISOString()

            .slice(0, 10),

        startTime,

        endTime,

        durationMinutes:

          dto.durationMinutes,

        timezone:

          dto.timezone ||

          "UTC",

        passcode:

          dto.passcode?.trim(),

        visibility:

          dto.visibility ?? "private",

        requireApproval:

          dto.requireApproval ?? true,

        allowGuests:

          dto.allowGuests ?? false,

        maxParticipants:

          dto.maxParticipants ?? undefined,

        meetingCode:

          this.generateMeetingCode(),

        joinToken:

          this.generateJoinToken(),

        status:

          "scheduled",

        security: {

          waitingRoomEnabled:

            dto.security

              ?.waitingRoomEnabled ??

            true,

          allowJoinBeforeHost:

            dto.security

              ?.allowJoinBeforeHost ??

            false,

          muteParticipantsOnEntry:

            dto.security

              ?.muteParticipantsOnEntry ??

            true,

          screenShareWhoCanShare:

            dto.security

              ?.screenShareWhoCanShare ??

            "host_only",

          locked:

            dto.security?.locked ??

            false,

        },

        secretary: {

          enabled:

            dto.secretary?.enabled ??

            true,

          takeNotes:

            dto.secretary?.takeNotes ??

            true,

          generateTranscript:

            dto.secretary

              ?.generateTranscript ??

            true,

          identifyMainPoints:

            dto.secretary

              ?.identifyMainPoints ??

            true,

          identifyDecisions:

            dto.secretary

              ?.identifyDecisions ??

            true,

          identifyActionItems:

            dto.secretary

              ?.identifyActionItems ??

            true,

          identifyQuestions:

            dto.secretary

              ?.identifyQuestions ??

            true,

          generateSummary:

            dto.secretary

              ?.generateSummary ??

            true,

          generatePdfReport:

            dto.secretary

              ?.generatePdfReport ??

            true,

        },

        recordingEnabled:

          dto.recordingEnabled ??

          true,

      });

    /* ------------------------------------------------------------------------

     * HOST PARTICIPANT

     * ---------------------------------------------------------------------- */

    await this.participantModel.create({

      meetingId:

        meeting._id,

      userId:

        hostObjectId,

      displayName:

        userName,

      role:

        "host",

      invited:

        false,

      invitationStatus:

        "accepted",

      micOn:

        true,

      cameraOn:

        true,

      admitted:

        true,

      waiting:

        false,

      joinedAt:

        undefined,

    });

    /* ------------------------------------------------------------------------

     * INVITED PARTICIPANTS

     *

     * IMPORTANT:

     * invited = true

     * invitationStatus = pending

     * ---------------------------------------------------------------------- */

    if (

      filteredInviteeIds.length >

      0

    ) {

      await this.participantModel.insertMany(

        filteredInviteeIds.map(

          (inviteeId) => ({

            meetingId:

              meeting._id,

            userId:

              inviteeId,

            displayName:

              "Invited participant",

            role:

              "participant",

            invited:

              true,

            invitationStatus:

              "pending",

            micOn:

              false,

            cameraOn:

              false,

            admitted:

              false,

            waiting:

              false,

          }),

        ),

      );

    }

    /* ------------------------------------------------------------------------

     * AGENDA

     * ---------------------------------------------------------------------- */

    const agenda =

      dto.agenda || [];

    if (

      agenda.length > 0

    ) {

      await this.agendaModel.insertMany(

        agenda.map(

          (item, index) => ({

            meetingId:

              meeting._id,

            title:

              item.title.trim(),

            order:

              item.order ??

              index,

            completed:

              false,

          }),

        ),

      );

    }

    return this.getById(

      meeting._id.toString(),

      userId,

    );

  }

  /* ==========================================================================

   * UPCOMING

   * ======================================================================== */

  async listUpcoming(

    userId: string,

  ) {

    const participantIds =

      await this.getParticipantMeetingIds(

        userId,

      );

    const meetings =

      await this.meetingModel

        .find({

          $or: [

            {

              hostId:

                this.userId(userId),

            },

            {

              _id: {

                $in:

                  participantIds,

              },

            },

          ],

          status: {

            $in: [

              "scheduled",

              "starting_soon",

              "late",

            ],

          },

          startTime: {

            $gte:

              new Date(),

          },

        })

        .sort({

          startTime: 1,

        })

        .lean();

    return meetings.map(

      (meeting) =>

        this.normalizeMeeting(

          meeting,

        ),

    );

  }

  /* ==========================================================================

   * TODAY

   * ======================================================================== */

  async listToday(

    userId: string,

  ) {

    const start =

      new Date();

    start.setHours(

      0,

      0,

      0,

      0,

    );

    const end =

      new Date(start);

    end.setDate(

      end.getDate() + 1,

    );

    const participantIds =

      await this.getParticipantMeetingIds(

        userId,

      );

    const meetings =

      await this.meetingModel

        .find({

          $or: [

            {

              hostId:

                this.userId(userId),

            },

            {

              _id: {

                $in:

                  participantIds,

              },

            },

          ],

          startTime: {

            $gte: start,

            $lt: end,

          },

          status: {

            $nin: [

              "cancelled",

            ],

          },

        })

        .sort({

          startTime: 1,

        })

        .lean();

    return meetings.map(

      (meeting) =>

        this.normalizeMeeting(

          meeting,

        ),

    );

  }

  /* ==========================================================================

   * RECENT

   * ======================================================================== */

  async listRecent(

    userId: string,

  ) {

    const participantIds =

      await this.getParticipantMeetingIds(

        userId,

      );

    const meetings =

      await this.meetingModel

        .find({

          $or: [

            {

              hostId:

                this.userId(userId),

            },

            {

              _id: {

                $in:

                  participantIds,

              },

            },

          ],

          status:

            "ended",

        })

        .sort({

          endedAt: -1,

        })

        .limit(50)

        .lean();

    return meetings.map(

      (meeting) =>

        this.normalizeMeeting(

          meeting,

        ),

    );

  }

  /* ==========================================================================

   * INVITATIONS

   * ======================================================================== */

  async listInvitations(

    userId: string,

  ) {

    const participantRows =

      await this.participantModel

        .find({

          userId:

            this.userId(userId),

          invited:

            true,

          invitationStatus: {

            $in: [

              "pending",

              "accepted",

              "declined",

            ],

          },

          role: {

            $ne: "host",

          },

        })

        .select(

          "meetingId displayName role invited invitationStatus admitted waiting",

        )

        .lean();

    if (

      participantRows.length ===

      0

    ) {

      return [];

    }

    const meetingIds =

      participantRows.map(

        (row) =>

          row.meetingId,

      );

    const meetings =

      await this.meetingModel

        .find({

          _id: {

            $in:

              meetingIds,

          },

          status: {

            $nin: [

              "ended",

              "cancelled",

            ],

          },

        })

        .sort({

          startTime: 1,

        })

        .lean();

    return meetings.map(

      (meeting) => {

        const participant =

          participantRows.find(

            (row) =>

              row.meetingId.toString() ===

              meeting._id.toString(),

          );

        return {

          ...this.normalizeMeeting(

            meeting,

          ),

          invitationStatus:

            participant?.invitationStatus ||

            "pending",

          invited:

            participant?.invited ??

            true,

          admitted:

            participant?.admitted ??

            false,

          waiting:

            participant?.waiting ??

            false,

          role:

            participant?.role ||

            "participant",

          displayName:

            participant?.displayName ||

            null,

        };

      },

    );

  }

  /* ==========================================================================

   * ACCEPT INVITATION

   *

   * User accepts an invitation.

   *

   * This does NOT automatically put the user

   * into the meeting. It only accepts the

   * invitation.

   * ======================================================================== */

  async acceptInvitation(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.meetingModel.findById(

        this.meetingObjectId(

          meetingId,

        ),

      );

    if (!meeting) {

      throw new NotFoundException(

        "Meeting not found",

      );

    }

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "This meeting has been cancelled",

      );

    }

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "This meeting has ended",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(userId),

        invited:

          true,

      });

    if (!participant) {

      throw new NotFoundException(

        "Meeting invitation not found",

      );

    }

    if (

      participant.role ===

      "host"

    ) {

      throw new BadRequestException(

        "The meeting host cannot accept an invitation",

      );

    }

    if (

      participant.invitationStatus ===

      "accepted"

    ) {

      return {

        success: true,

        message:

          "Invitation already accepted",

        meetingId:

          meeting._id.toString(),

        invitationStatus:

          participant.invitationStatus,

      };

    }

    participant.invitationStatus =

      "accepted";

    participant.waiting =

      false;

    participant.admitted =

      false;

    await participant.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      invitationStatus:

        "accepted",

      admitted:

        false,

      waiting:

        false,

    };

  }

  /* ==========================================================================

   * DECLINE INVITATION

   * ======================================================================== */

  async declineInvitation(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.meetingModel.findById(

        this.meetingObjectId(

          meetingId,

        ),

      );

    if (!meeting) {

      throw new NotFoundException(

        "Meeting not found",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(userId),

        invited:

          true,

      });

    if (!participant) {

      throw new NotFoundException(

        "Meeting invitation not found",

      );

    }

    if (

      participant.role ===

      "host"

    ) {

      throw new BadRequestException(

        "The meeting host cannot decline the invitation",

      );

    }

    participant.invitationStatus =

      "declined";

    participant.admitted =

      false;

    participant.waiting =

      false;

    participant.leftAt =

      new Date();

    await participant.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      invitationStatus:

        "declined",

    };

  }

  /* ==========================================================================

   * REMOVE INVITATION

   *

   * Host removes an invited user.

   *

   * This deletes the participant/invitation

   * record completely.

   * ======================================================================== */

  async removeInvitation(

    meetingId: string,

    userId: string,

    inviteeId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "This meeting has already ended",

      );

    }

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "This meeting has been cancelled",

      );

    }

    const inviteeObjectId =

      this.userId(inviteeId);

    if (

      meeting.hostId.toString() ===

      inviteeObjectId.toString()

    ) {

      throw new BadRequestException(

        "The host cannot be removed from the meeting",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          inviteeObjectId,

        invited:

          true,

      });

    if (!participant) {

      throw new NotFoundException(

        "Invitation not found",

      );

    }

    await this.participantModel.deleteOne({

      _id:

        participant._id,

    });

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      userId:

        inviteeObjectId.toString(),

      message:

        "Invitation removed",

    };

  }

  /* ==========================================================================

   * PARTICIPANT IDS

   * ======================================================================== */

  private async getParticipantMeetingIds(

    userId: string,

  ) {

    const rows =

      await this.participantModel

        .find({

          userId:

            this.userId(userId),

          invitationStatus: {

            $ne:

              "declined",

          },

        })

        .select(

          "meetingId",

        )

        .lean();

    return rows.map(

      (row) =>

        row.meetingId,

    );

  }

  /* ==========================================================================

   * GET ONE

   * ======================================================================== */

  async getById(

    meetingId: string,

    userId: string,

  ) {

    const objectId =

      this.meetingObjectId(

        meetingId,

      );

    const meeting =

      await this.meetingModel.findById(

        objectId,

      );

    if (!meeting) {

      throw new NotFoundException(

        "Meeting not found",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(userId),

      });

    if (

      meeting.hostId.toString() !==

        userId &&

      !participant

    ) {

      throw new ForbiddenException(

        "You are not a participant of this meeting",

      );

    }

    if (

      participant &&

      participant.invitationStatus ===

        "declined"

    ) {

      throw new ForbiddenException(

        "You declined this meeting invitation",

      );

    }

    const [

      participants,

      agenda,

    ] = await Promise.all([

      this.participantModel

        .find({

          meetingId:

            meeting._id,

        })

        .lean(),

      this.agendaModel

        .find({

          meetingId:

            meeting._id,

        })

        .sort({

          order: 1,

        })

        .lean(),

    ]);

    return {

      ...this.normalizeMeeting(

        meeting,

      ),

      participants,

      participantCount:

        participants.length,

      agenda,

    };

  }

  /* ==========================================================================

   * UPDATE SCHEDULE

   * ======================================================================== */

  async update(

    meetingId: string,

    userId: string,

    dto: UpdateMeetingDto,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    if (

      meeting.status ===

        "ended" ||

      meeting.status ===

        "cancelled"

    ) {

      throw new BadRequestException(

        "This meeting can no longer be modified",

      );

    }

    if (

      dto.topic !==

      undefined

    ) {

      if (!dto.topic.trim()) {

        throw new BadRequestException(

          "Meeting topic is required",

        );

      }

      meeting.topic =

        dto.topic.trim();

    }

    if (

      dto.description !==

      undefined

    ) {

      meeting.description =

        dto.description;

    }

    if (

      dto.durationMinutes !==

      undefined

    ) {

      if (

        dto.durationMinutes <=

        0

      ) {

        throw new BadRequestException(

          "Duration must be greater than zero",

        );

      }

      meeting.durationMinutes =

        dto.durationMinutes;

    }

    if (

      dto.startTime !==

      undefined

    ) {

      const start =

        new Date(

          dto.startTime,

        );

      if (

        Number.isNaN(

          start.getTime(),

        )

      ) {

        throw new BadRequestException(

          "Invalid start time",

        );

      }

      if (

        start.getTime() <=

        Date.now()

      ) {

        throw new BadRequestException(

          "Meeting start time must be in the future",

        );

      }

      meeting.startTime =

        start;

      meeting.date =

        start

          .toISOString()

          .slice(0, 10);

    }

    meeting.endTime =

      new Date(

        meeting.startTime.getTime() +

          meeting.durationMinutes *

            60 *

            1000,

      );

    if (

      dto.timezone !==

      undefined

    ) {

      meeting.timezone =

        dto.timezone;

    }

    if (

      dto.passcode !==

      undefined

    ) {

      meeting.passcode =

        dto.passcode;

    }

    if (

      dto.visibility !==

      undefined

    ) {

      meeting.visibility =

        dto.visibility;

    }

    if (

      dto.requireApproval !==

      undefined

    ) {

      meeting.requireApproval =

        dto.requireApproval;

    }

    if (

      dto.allowGuests !==

      undefined

    ) {

      meeting.allowGuests =

        dto.allowGuests;

    }

    if (

      dto.maxParticipants !==

      undefined

    ) {

      meeting.maxParticipants =

        dto.maxParticipants;

    }

    if (

      dto.recordingEnabled !==

      undefined

    ) {

      meeting.recordingEnabled =

        dto.recordingEnabled;

    }

    if (dto.security) {

      meeting.security = {

        ...meeting.security,

        ...dto.security,

      };

    }

    if (dto.secretary) {

      meeting.secretary = {

        ...meeting.secretary,

        ...dto.secretary,

      };

    }

    // Persist agenda items whenever the meeting editor sends an agenda update.

    if (dto.agenda !== undefined) {

      await this.agendaModel.deleteMany({

        meetingId: meeting._id,

      });

      const agendaItems = (dto.agenda || [])

        .map((item, index) => ({

          meetingId: meeting._id,

          title:

            typeof item.title === "string"

              ? item.title.trim()

              : "",

          order:

            typeof item.order === "number"

              ? item.order

              : index,

          completed: false,

        }))

        .filter((item) => Boolean(item.title))

        .sort((a, b) => a.order - b.order)

        .map((item, index) => ({

          ...item,

          order: index,

        }));

      if (agendaItems.length > 0) {

        await this.agendaModel.insertMany(agendaItems);

      }

    }

    await meeting.save();

    return this.getById(

      meetingId,

      userId,

    );

  }

  /* ==========================================================================

   * CANCEL

   * ======================================================================== */

  async cancel(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "Meeting already ended",

      );

    }

    meeting.status =

      "cancelled";

    await meeting.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      status:

        meeting.status,

    };

  }

  /* ==========================================================================

   * START

   * ======================================================================== */

  async start(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "Meeting is cancelled",

      );

    }

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "Meeting already ended",

      );

    }

    meeting.status =

      "live";

    meeting.startedAt =

      new Date();

    meeting.liveRoomName =

      `fockis-meeting-${meeting._id}`;

    await meeting.save();

    /*

     * Make sure the host is admitted.

     */

    await this.participantModel.updateOne(

      {

        meetingId:

          meeting._id,

        userId:

          this.userId(userId),

      },

      {

        $set: {

          admitted:

            true,

          waiting:

            false,

          invitationStatus:

            "accepted",

        },

      },

    );

    return {

      roomToken:

        null,

      roomName:

        meeting.liveRoomName,

      meetingId:

        meeting._id.toString(),

      status:

        meeting.status,

    };

  }

  /* ==========================================================================

   * END

   * ======================================================================== */

  async end(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "Meeting already ended",

      );

    }

    meeting.status =

      "ended";

    meeting.endedAt =

      new Date();

    await meeting.save();

    await this.participantModel.updateMany(

      {

        meetingId:

          meeting._id,

        leftAt: {

          $exists: false,

        },

      },

      {

        $set: {

          leftAt:

            new Date(),

        },

      },

    );

    return {

      success: true,

    };

  }

  /* ==========================================================================

   * JOIN

   * ======================================================================== */

  async join(

    meetingId: string,

    userId: string,

    userName: string,

    passcode?: string,

  ) {

    const meeting =

      await this.findMeetingByReference(

        meetingId,

      );

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "Meeting is cancelled",

      );

    }

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "Meeting has ended",

      );

    }

    if (

      meeting.passcode &&

      meeting.passcode !==

        passcode

    ) {

      throw new ForbiddenException(

        "Invalid meeting passcode",

      );

    }

    const currentUserId =

      this.userId(userId);

    const now =

      Date.now();

    const startTime =

      meeting.startTime.getTime();

    const allowBeforeHost =

      meeting.security

        ?.allowJoinBeforeHost ===

      true;

    const waitingRoomEnabled =

      meeting.security

        ?.waitingRoomEnabled ===

      true;

    /*

     * Before the scheduled start:

     *

     * - The host can always enter.

     * - A participant can request access when the waiting room is enabled.

     * - Explicit allowJoinBeforeHost also permits access.

     *

     * A waiting-room request does NOT admit the participant into the room.

     * It creates/updates the participant as waiting until the host admits them.

     */

    if (

      meeting.status ===

        "scheduled" &&

      now < startTime

    ) {

      const isHost =

        meeting.hostId.toString() ===

        userId;

      if (

        !isHost &&

        !allowBeforeHost &&

        !waitingRoomEnabled

      ) {

        throw new BadRequestException(

          `This meeting is scheduled for ${meeting.startTime.toISOString()}`,

        );

      }

    }

    let participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          currentUserId,

      });

    /*

     * ------------------------------------------------------------------------

     * EXISTING INVITATION

     * ------------------------------------------------------------------------

     */

    if (

      participant &&

      participant.invited &&

      participant.role !==

        "host"

    ) {

      /*

       * Declined users cannot join.

       */

      if (

        participant.invitationStatus ===

        "declined"

      ) {

        throw new ForbiddenException(

          "You declined this meeting invitation",

        );

      }

      /*

       * A participant who follows the meeting join flow is explicitly

       * requesting access. Accept a pending invitation here so the

       * waiting-room flow works from the private join link without

       * requiring a separate invitation-page action.

       */

      if (

        participant.invitationStatus ===

        "pending"

      ) {

        participant.invitationStatus =

          "accepted";

      }

    }

    /*

     * ------------------------------------------------------------------------

     * CREATE NON-INVITED PARTICIPANT

     * ------------------------------------------------------------------------

     */

    if (!participant) {

      if (

        meeting.maxParticipants !==

          undefined &&

        meeting.hostId.toString() !==

          userId

      ) {

        const activeParticipantCount =

          await this.participantModel.countDocuments({

            meetingId:

              meeting._id,

            admitted:

              true,

            invitationStatus:

              "accepted",

            leftAt: {

              $exists: false,

            },

          });

        if (

          activeParticipantCount >=

          meeting.maxParticipants

        ) {

          throw new BadRequestException(

            "This meeting has reached its maximum participant capacity",

          );

        }

      }

      participant =

        await this.participantModel.create({

          meetingId:

            meeting._id,

          userId:

            currentUserId,

          displayName:

            userName,

          role:

            meeting.hostId.toString() ===

            userId

              ? "host"

              : "participant",

          invited:

            false,

          invitationStatus:

            meeting.hostId.toString() ===

            userId

              ? "accepted"

              : "accepted",

          micOn:

            !meeting.security

              .muteParticipantsOnEntry,

          cameraOn:

            true,

          admitted:

            meeting.hostId.toString() ===

              userId ||

            !meeting.security

              .waitingRoomEnabled,

          waiting:

            meeting.hostId.toString() !==

              userId &&

            meeting.security

              .waitingRoomEnabled,

        });

    }

    /*

     * Update display name.

     */

    if (

      participant.role !==

      "host"

    ) {

      participant.displayName =

        userName;

    }

    /*

     * ------------------------------------------------------------------------

     * WAITING ROOM

     * ------------------------------------------------------------------------

     */

    if (

      participant.waiting

    ) {

      participant.invitationStatus =

        "accepted";

      await participant.save();

      return {

        admitted:

          false,

        waiting:

          true,

        meetingId:

          meeting._id.toString(),

        status:

          meeting.status,

        message:

          "Waiting for the host to admit you",

      };

    }

    /*

     * ------------------------------------------------------------------------

     * ADMITTED

     * ------------------------------------------------------------------------

     */

    participant.admitted =

      true;

    participant.waiting =

      false;

    participant.invitationStatus =

      "accepted";

    participant.joinedAt =

      new Date();

    participant.leftAt =

      undefined;

    await participant.save();

    /*

     * Automatically make the meeting live

     * once scheduled time has arrived.

     */

    if (

      meeting.status ===

        "scheduled" &&

      now >= startTime

    ) {

      meeting.status =

        "live";

      meeting.startedAt ||=

        new Date();

      meeting.liveRoomName ||=

        `fockis-meeting-${meeting._id}`;

      await meeting.save();

    }

    return {

      admitted:

        true,

      waiting:

        false,

      meetingId:

        meeting._id.toString(),

      roomName:

        meeting.liveRoomName ||

        `fockis-meeting-${meeting._id}`,

      roomToken:

        null,

      status:

        meeting.status,

      scheduledStartTime:

        meeting.startTime,

    };

  }

  /**

   * Mark a participant as having left the meeting.

   */

  async leave(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.findMeetingByReference(

        meetingId,

      );

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(userId),

      });

    if (!participant) {

      throw new NotFoundException(

        "Participant not found",

      );

    }

    participant.admitted = false;

    participant.waiting = false;

    participant.leftAt = new Date();

    participant.handRaised = false;

    participant.screenSharing = false;

    participant.isSpeaking = false;

    await participant.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      userId,

      leftAt:

        participant.leftAt,

    };

  }

  /* ==========================================================================

   * ADMIT PARTICIPANT

   *

   * Host action.

   *

   * Moves a participant from the waiting

   * room into the meeting.

   * ======================================================================== */

  async admitParticipant(

    meetingId: string,

    hostUserId: string,

    participantUserId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        hostUserId,

      );

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "This meeting has ended",

      );

    }

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "This meeting has been cancelled",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(

            participantUserId,

          ),

        role: {

          $ne: "host",

        },

      });

    if (!participant) {

      throw new NotFoundException(

        "Participant not found",

      );

    }

    if (

      !participant.waiting

    ) {

      if (

        participant.admitted

      ) {

        return {

          success: true,

          message:

            "Participant is already admitted",

          meetingId:

            meeting._id.toString(),

          userId:

            participant.userId.toString(),

          admitted:

            true,

          waiting:

            false,

        };

      }

      throw new BadRequestException(

        "Participant is not waiting for admission",

      );

    }

    if (

      meeting.maxParticipants !==

        undefined

    ) {

      const activeParticipantCount =

        await this.participantModel.countDocuments({

          meetingId:

            meeting._id,

          admitted:

            true,

          invitationStatus:

            "accepted",

          leftAt: {

            $exists: false,

          },

        });

      if (

        activeParticipantCount >=

        meeting.maxParticipants

      ) {

        throw new BadRequestException(

          "This meeting has reached its maximum participant capacity",

        );

      }

    }

    participant.admitted =

      true;

    participant.waiting =

      false;

    participant.invitationStatus =

      "accepted";

    await participant.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      userId:

        participant.userId.toString(),

      admitted:

        true,

      waiting:

        false,

      message:

        "Participant admitted",

    };

  }

  /* ==========================================================================

   * REJECT PARTICIPANT

   *

   * Host action.

   *

   * Rejects somebody waiting to enter.

   *

   * The participant record remains so the

   * frontend can know that the request was

   * rejected.

   * ======================================================================== */

  async rejectParticipant(

    meetingId: string,

    hostUserId: string,

    participantUserId: string,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        hostUserId,

      );

    if (

      meeting.status ===

      "ended"

    ) {

      throw new BadRequestException(

        "This meeting has ended",

      );

    }

    if (

      meeting.status ===

      "cancelled"

    ) {

      throw new BadRequestException(

        "This meeting has been cancelled",

      );

    }

    const participant =

      await this.participantModel.findOne({

        meetingId:

          meeting._id,

        userId:

          this.userId(

            participantUserId,

          ),

        role: {

          $ne: "host",

        },

      });

    if (!participant) {

      throw new NotFoundException(

        "Participant not found",

      );

    }

    if (

      participant.admitted &&

      !participant.waiting

    ) {

      throw new BadRequestException(

        "This participant is already admitted",

      );

    }

    participant.waiting =

      false;

    participant.admitted =

      false;

    participant.invitationStatus =

      "declined";

    participant.leftAt =

      new Date();

    await participant.save();

    return {

      success: true,

      meetingId:

        meeting._id.toString(),

      userId:

        participant.userId.toString(),

      admitted:

        false,

      waiting:

        false,

      invitationStatus:

        "declined",

      message:

        "Participant rejected",

    };

  }

  /* ==========================================================================

   * OWNERSHIP

   * ======================================================================== */

  async getOwnedMeeting(

    meetingId: string,

    userId: string,

  ) {

    const meeting =

      await this.meetingModel.findById(

        this.meetingObjectId(

          meetingId,

        ),

      );

    if (!meeting) {

      throw new NotFoundException(

        "Meeting not found",

      );

    }

    if (

      meeting.hostId.toString() !==

      userId

    ) {

      throw new ForbiddenException(

        "Only the meeting host can perform this action",

      );

    }

    return meeting;

  }

  /* ==========================================================================

   * SETTINGS

   * ======================================================================== */

  async updateSettings(

    meetingId: string,

    userId: string,

    dto: UpdateMeetingSettingsDto,

  ) {

    const meeting =

      await this.getOwnedMeeting(

        meetingId,

        userId,

      );

    const {

      recordingEnabled,

      ...securitySettings

    } = dto as any;

    meeting.security = {

      ...meeting.security,

      ...securitySettings,

    };

    if (

      recordingEnabled !==

      undefined

    ) {

      meeting.recordingEnabled =

        recordingEnabled;

    }

    await meeting.save();

    return this.normalizeMeeting(

      meeting,

    );

  }

  /* ==========================================================================

   * CHAT

   * ======================================================================== */

  async addMessage(

    meetingId: string,

    userId: string,

    authorName: string,

    dto: SendMeetingMessageDto,

  ) {

    await this.ensureParticipant(

      meetingId,

      userId,

    );

    if (!dto.body?.trim()) {

      throw new BadRequestException(

        "Message cannot be empty",

      );

    }

    return this.messageModel.create({

      meetingId:

        this.meetingObjectId(

          meetingId,

        ),

      authorId:

        this.userId(userId),

      authorName,

      body:

        dto.body.trim(),

      mentions:

        dto.mentions || [],

      attachmentName:

        dto.attachmentName,

    });

  }

  async getMessages(

    meetingId: string,

    userId: string,

  ) {

    await this.ensureParticipant(

      meetingId,

      userId,

    );

    return this.messageModel

      .find({

        meetingId:

          this.meetingObjectId(

            meetingId,

          ),

      })

      .sort({

        createdAt: 1,

      })

      .limit(500)

      .lean();

  }

  /* ==========================================================================

   * REACTIONS

   * ======================================================================== */

  async addReaction(

    meetingId: string,

    userId: string,

    dto: CreateReactionDto,

  ) {

    await this.ensureParticipant(

      meetingId,

      userId,

    );

    return this.reactionModel.create({

      meetingId:

        this.meetingObjectId(

          meetingId,

        ),

      userId:

        this.userId(userId),

      emoji:

        dto.emoji,

    });

  }

  /* ==========================================================================

   * PARTICIPANTS

   * ======================================================================== */

  async getParticipants(
    meetingId: string,
    userId: string,
  ) {
    const meeting = await this.meetingModel.findById(
      this.meetingObjectId(meetingId),
    );

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const participant = await this.participantModel.findOne({
      meetingId: meeting._id,
      userId: this.userId(userId),
    });

    const isHost = meeting.hostId.toString() === userId;

    // The host must always be able to load the participant list,
    // including the waiting-room participants.
    if (isHost) {
      return this.participantModel
        .find({
          meetingId: meeting._id,
        })
        .lean();
    }

    if (!participant) {
      throw new ForbiddenException(
        "You are not a participant of this meeting",
      );
    }

    if (participant.invitationStatus === "declined") {
      throw new ForbiddenException(
        "You declined this meeting invitation",
      );
    }

    // Waiting-room participants may not see the full participant list
    // until they are admitted.
    if (participant.waiting || !participant.admitted) {
      throw new ForbiddenException(
        "You have not been admitted to this meeting",
      );
    }

    return this.participantModel
      .find({
        meetingId: meeting._id,
      })
      .lean();
  }

  /* ============================================================================

   * WAITING ROOM

   *

   * Returns participants currently waiting

   * for host admission.

   * ======================================================================== */

  async getWaitingParticipants(

    meetingId: string,

    userId: string,

  ) {

    await this.getOwnedMeeting(

      meetingId,

      userId,

    );

    return this.participantModel

      .find({

        meetingId:

          this.meetingObjectId(

            meetingId,

          ),

        waiting:

          true,

        admitted:

          false,

        role: {

          $ne: "host",

        },

      })

      .sort({

        createdAt: 1,

      })

      .lean();

  }

  /* ==========================================================================

   * ENSURE PARTICIPANT

   * ======================================================================== */

  async ensureParticipant(
    meetingId: string,
    userId: string,
  ) {
    const meeting = await this.meetingModel.findById(
      this.meetingObjectId(meetingId),
    );

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const participant = await this.participantModel.findOne({
      meetingId: meeting._id,
      userId: this.userId(userId),
    });

    if (!participant) {
      throw new ForbiddenException(
        "You are not a participant",
      );
    }

    if (participant.invitationStatus === "declined") {
      throw new ForbiddenException(
        "You declined this meeting invitation",
      );
    }

    // IMPORTANT:
    // A waiting participant is authenticated and is a valid participant,
    // but is not yet admitted to the meeting room. Returning the record here
    // lets the Socket.IO gateway place them into the waiting room instead of
    // incorrectly returning HTTP/WebSocket 403.
    if (participant.waiting && !participant.admitted) {
      return participant;
    }

    if (!participant.admitted) {
      throw new ForbiddenException(
        "You have not been admitted to this meeting",
      );
    }

    return participant;
  }

}