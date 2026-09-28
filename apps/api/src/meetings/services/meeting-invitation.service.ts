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
  MeetingInvitation,
} from "../schemas/meeting-invitation.schema";

@Injectable()
export class MeetingInvitationService {
  constructor(
    @InjectModel(
      MeetingInvitation.name,
    )
    private readonly invitationModel: Model<MeetingInvitation>,
  ) {}

  async create(
    meetingId: string,
    inviterId: string,
    options: {
      inviteeId?: string;
      email?: string;
    },
  ) {
    return this.invitationModel.create({
      meetingId:
        new Types.ObjectId(
          meetingId,
        ),

      inviterId:
        new Types.ObjectId(
          inviterId,
        ),

      inviteeId:
        options.inviteeId
          ? new Types.ObjectId(
              options.inviteeId,
            )
          : undefined,

      email:
        options.email
          ?.toLowerCase()
          .trim(),

      status: "pending",

      expiresAt:
        new Date(
          Date.now() +
            7 *
              24 *
              60 *
              60 *
              1000,
        ),
    });
  }

  async listForMeeting(
    meetingId: string,
  ) {
    return this.invitationModel
      .find({
        meetingId:
          new Types.ObjectId(
            meetingId,
          ),
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async respond(
    invitationId: string,
    userId: string,
    status:
      | "accepted"
      | "declined",
  ) {
    const invitation =
      await this.invitationModel.findOne({
        _id:
          new Types.ObjectId(
            invitationId,
          ),

        $or: [
          {
            inviteeId:
              new Types.ObjectId(
                userId,
              ),
          },
          {
            email:
              userId.toLowerCase(),
          },
        ],
      });

    if (!invitation) {
      throw new NotFoundException(
        "Invitation not found",
      );
    }

    invitation.status =
      status;

    invitation.respondedAt =
      new Date();

    return invitation.save();
  }
}