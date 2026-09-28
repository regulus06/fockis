import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";

import {
  Meeting,
  MeetingSchema,
} from "./schemas/meeting.schema";

import {
  MeetingParticipant,
  MeetingParticipantSchema,
} from "./schemas/meeting-participant.schema";

import {
  MeetingAgenda,
  MeetingAgendaSchema,
} from "./schemas/meeting-agenda.schema";

import {
  MeetingAttendance,
  MeetingAttendanceSchema,
} from "./schemas/meeting-attendance.schema";

import {
  MeetingMessage,
  MeetingMessageSchema,
} from "./schemas/meeting-message.schema";

import {
  MeetingReaction,
  MeetingReactionSchema,
} from "./schemas/meeting-reaction.schema";

import {
  MeetingTranscript,
  MeetingTranscriptSchema,
} from "./schemas/meeting-transcript.schema";

import {
  MeetingSummary,
  MeetingSummarySchema,
} from "./schemas/meeting-summary.schema";

import {
  MeetingActionItem,
  MeetingActionItemSchema,
} from "./schemas/meeting-action-item.schema";

import {
  MeetingInvitation,
  MeetingInvitationSchema,
} from "./schemas/meeting-invitation.schema";

import { MeetingsController } from "./controllers/meetings.controller";
import { MeetingAttendanceController } from "./controllers/meeting-attendance.controller";
import { MeetingTranscriptController } from "./controllers/meeting-transcript.controller";
import { MeetingSecretaryController } from "./controllers/meeting-secretary.controller";
import { MeetingPdfController } from "./controllers/meeting-pdf.controller";

import { MeetingsGateway } from "./gateways/meetings.gateway";

import { MeetingsService } from "./services/meetings.service";
import { MeetingAttendanceService } from "./services/meeting-attendance.service";
import { MeetingTranscriptService } from "./services/meeting-transcript.service";
import { MeetingSecretaryService } from "./services/meeting-secretary.service";
import { MeetingSummaryService } from "./services/meeting-summary.service";
import { MeetingInvitationService } from "./services/meeting-invitation.service";

@Module({
  imports: [
    AuthModule,

    MongooseModule.forFeature([
      {
        name: Meeting.name,
        schema: MeetingSchema,
      },
      {
        name: MeetingParticipant.name,
        schema: MeetingParticipantSchema,
      },
      {
        name: MeetingAgenda.name,
        schema: MeetingAgendaSchema,
      },
      {
        name: MeetingAttendance.name,
        schema: MeetingAttendanceSchema,
      },
      {
        name: MeetingMessage.name,
        schema: MeetingMessageSchema,
      },
      {
        name: MeetingReaction.name,
        schema: MeetingReactionSchema,
      },
      {
        name: MeetingTranscript.name,
        schema: MeetingTranscriptSchema,
      },
      {
        name: MeetingSummary.name,
        schema: MeetingSummarySchema,
      },
      {
        name: MeetingActionItem.name,
        schema: MeetingActionItemSchema,
      },
      {
        name: MeetingInvitation.name,
        schema: MeetingInvitationSchema,
      },
    ]),
  ],

  controllers: [
    MeetingsController,
    MeetingAttendanceController,
    MeetingTranscriptController,
    MeetingSecretaryController,
    MeetingPdfController,
  ],

  providers: [
    MeetingsService,
    MeetingAttendanceService,
    MeetingTranscriptService,
    MeetingSecretaryService,
    MeetingSummaryService,
    MeetingInvitationService,
    MeetingsGateway,
  ],

  exports: [
    MeetingsService,
    MeetingAttendanceService,
    MeetingTranscriptService,
    MeetingSecretaryService,
    MeetingSummaryService,
    MeetingInvitationService,
  ],
})
export class MeetingsModule {}