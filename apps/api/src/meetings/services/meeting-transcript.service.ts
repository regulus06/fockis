import {
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
  MeetingTranscript,
} from "../schemas/meeting-transcript.schema";

import {
  MeetingParticipant,
} from "../schemas/meeting-participant.schema";

@Injectable()
export class MeetingTranscriptService {
  constructor(
    @InjectModel(
      MeetingTranscript.name,
    )
    private readonly transcriptModel: Model<MeetingTranscript>,

    @InjectModel(
      MeetingParticipant.name,
    )
    private readonly participantModel: Model<MeetingParticipant>,
  ) {}

  async getFullTranscript(
    meetingId: string,
    userId: string,
  ) {
    await this.ensureAccess(
      meetingId,
      userId,
    );

    return this.transcriptModel
      .find({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),
      })
      .sort({
        timestamp: 1,
        sequence: 1,
      })
      .lean();
  }

  async searchTranscript(
    meetingId: string,
    userId: string,
    query: string,
  ) {
    await this.ensureAccess(
      meetingId,
      userId,
    );

    const safe =
      query
        .trim()
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

    if (!safe) {
      return [];
    }

    return this.transcriptModel
      .find({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),

        text: {
          $regex: safe,
          $options: "i",
        },
      })
      .sort({
        timestamp: 1,
      })
      .limit(200)
      .lean();
  }

  async addLine(
    meetingId: string,
    speakerId: string,
    speakerName: string,
    text: string,
    timestamp?: Date,
  ) {
    return this.transcriptModel.create({
      meetingId:
        new Types.ObjectId(
          meetingId,
        ),

      speakerId:
        new Types.ObjectId(
          speakerId,
        ),

      speakerName,

      text:
        text.trim(),

      timestamp:
        timestamp ||
        new Date(),

      sequence:
        await this.transcriptModel.countDocuments({
          meetingId:
            new Types.ObjectId(
              meetingId,
            ),
        }),
    });
  }

  async ensureAccess(
    meetingId: string,
    userId: string,
  ) {
    const participant =
      await this.participantModel.exists({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!participant) {
      throw new NotFoundException(
        "Meeting access denied",
      );
    }
  }
}