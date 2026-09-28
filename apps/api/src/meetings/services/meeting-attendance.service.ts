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
  MeetingAttendance,
} from "../schemas/meeting-attendance.schema";

import {
  MeetingParticipant,
} from "../schemas/meeting-participant.schema";

@Injectable()
export class MeetingAttendanceService {
  constructor(
    @InjectModel(MeetingAttendance.name)
    private readonly attendanceModel: Model<MeetingAttendance>,

    @InjectModel(MeetingParticipant.name)
    private readonly participantModel: Model<MeetingParticipant>,
  ) {}

  async getAttendance(
    meetingId: string,
    userId: string,
  ) {
    const isParticipant =
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

    if (!isParticipant) {
      throw new NotFoundException(
        "Meeting participant not found",
      );
    }

    return this.attendanceModel
      .find({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),
      })
      .sort({
        joinedAt: 1,
      })
      .lean();
  }

  async markJoined(
    meetingId: string,
    userId: string,
    userName: string,
    status:
      | "present"
      | "late"
      | "host"
      | "co_host" = "present",
  ) {
    return this.attendanceModel.findOneAndUpdate(
      {
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      },
      {
        $set: {
          userName,
          status,
          joinedAt:
            new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async markLeft(
    meetingId: string,
    userId: string,
  ) {
    const attendance =
      await this.attendanceModel.findOne({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      });

    if (!attendance) {
      return null;
    }

    attendance.leftAt =
      new Date();

    if (
      attendance.joinedAt
    ) {
      attendance.minutesPresent =
        Math.max(
          0,
          Math.round(
            (attendance.leftAt.getTime() -
              attendance.joinedAt.getTime()) /
              60000,
          ),
        );
    }

    await attendance.save();

    return attendance;
  }

  async submitLateNotice(
    meetingId: string,
    userId: string,
    minutes: number,
    message: string,
  ) {
    return this.attendanceModel.findOneAndUpdate(
      {
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),

        userId:
          new Types.ObjectId(
            userId,
          ),
      },
      {
        $set: {
          status: "late",
          lateNotice:
            message.trim(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }
}