import {
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  MeetingSummary,
  MeetingSummaryDocument,
} from "../schemas/meeting-summary.schema";

@Injectable()
export class MeetingSummaryService {
  constructor(
    @InjectModel(MeetingSummary.name)
    private readonly summaryModel:
      Model<MeetingSummaryDocument>,
  ) {}

  async get(
    meetingId: string,
  ) {
    if (!Types.ObjectId.isValid(meetingId)) {
      return null;
    }

    return this.summaryModel
      .findOne({
        meetingId:
          new Types.ObjectId(meetingId),
      })
      .lean();
  }

  async save(
    meetingId: string,
    data: {
      overview: string;

      mainPoints: string[];

      decisions: {
        id: string;
        text: string;
      }[];

      actionItems: {
        id: string;
        assigneeId?: string;
        assigneeName?: string;
        task: string;
        dueDate?: string;
        completed: boolean;
      }[];

      questions: {
        id: string;
        text: string;
        answered: boolean;
      }[];

      nextSteps: string[];
    },
  ) {
    if (!Types.ObjectId.isValid(meetingId)) {
      throw new Error(
        "Invalid meeting ID",
      );
    }

    return this.summaryModel.findOneAndUpdate(
      {
        meetingId:
          new Types.ObjectId(meetingId),
      },
      {
        $set: {
          ...data,
          generatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }
}