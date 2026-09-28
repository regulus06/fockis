import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  LiveGuest,
  LiveGuestDocument,
} from "../schemas/live-guest.schema";

import {
  LiveStream,
  LiveStreamDocument,
} from "../schemas/live-stream.schema";

import {
  InviteLiveGuestDto,
} from "../dto/live-guest.dto";

@Injectable()
export class LiveGuestService {
  constructor(
    @InjectModel(LiveGuest.name)
    private readonly liveGuestModel: Model<LiveGuestDocument>,

    @InjectModel(LiveStream.name)
    private readonly liveStreamModel: Model<LiveStreamDocument>,
  ) {}

  /**
   * Host invites a user to participate
   * in the LIVE.
   */
  async invite(
    hostId: string,
    streamId: string,
    dto: InviteLiveGuestDto,
  ) {
    const stream =
      await this.liveStreamModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    if (
      String(stream.hostId) !==
      String(hostId)
    ) {
      throw new BadRequestException(
        "Only the LIVE host can invite guests.",
      );
    }

    if (
      stream.status !== "live"
    ) {
      throw new BadRequestException(
        "Guests can only be invited while the LIVE is active.",
      );
    }

    if (
      String(dto.guestUserId) ===
      String(hostId)
    ) {
      throw new BadRequestException(
        "The host cannot invite themselves.",
      );
    }

    const existing =
      await this.liveGuestModel.findOne({
        streamId,
        guestUserId:
          dto.guestUserId,
        status: {
          $in: [
            "invited",
            "accepted",
            "connected",
          ],
        },
      });

    if (existing) {
      throw new BadRequestException(
        "This user already has an active guest invitation.",
      );
    }

    const guest =
      await this.liveGuestModel.create({
        streamId,
        hostId,
        guestUserId:
          dto.guestUserId,
        message:
          dto.message?.trim() || "",
        status: "invited",
        invitedAt: new Date(),
      });

    return this.serialize(
      guest,
    );
  }

  /**
   * Guest accepts or declines
   * an invitation.
   */
  async respond(
    guestUserId: string,
    invitationId: string,
    status:
      | "accepted"
      | "declined",
  ) {
    const guest =
      await this.liveGuestModel.findById(
        invitationId,
      );

    if (!guest) {
      throw new NotFoundException(
        "Guest invitation not found.",
      );
    }

    if (
      String(guest.guestUserId) !==
      String(guestUserId)
    ) {
      throw new BadRequestException(
        "You cannot respond to this invitation.",
      );
    }

    if (
      guest.status !== "invited"
    ) {
      throw new BadRequestException(
        "This invitation has already been processed.",
      );
    }

    const stream =
      await this.liveStreamModel.findById(
        guest.streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    if (
      stream.status !== "live"
    ) {
      throw new BadRequestException(
        "This LIVE is no longer active.",
      );
    }

    guest.status =
      status;

    guest.respondedAt =
      new Date();

    await guest.save();

    return this.serialize(
      guest,
    );
  }

  /**
   * Get invitations received by
   * the current user.
   */
  async getMyInvitations(
    guestUserId: string,
  ) {
    const invitations =
      await this.liveGuestModel
        .find({
          guestUserId,
          status: "invited",
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return invitations.map(
      (item) =>
        this.serialize(
          item,
        ),
    );
  }

  /**
   * Get all guests for a LIVE.
   */
  async getGuests(
    hostId: string,
    streamId: string,
  ) {
    const stream =
      await this.liveStreamModel.findById(
        streamId,
      );

    if (!stream) {
      throw new NotFoundException(
        "LIVE stream not found.",
      );
    }

    if (
      String(stream.hostId) !==
      String(hostId)
    ) {
      throw new BadRequestException(
        "Only the LIVE host can view guests.",
      );
    }

    const guests =
      await this.liveGuestModel
        .find({
          streamId,
          status: {
            $in: [
              "invited",
              "accepted",
              "connected",
            ],
          },
        })
        .sort({
          createdAt: 1,
        })
        .lean();

    return guests.map(
      (guest) =>
        this.serialize(
          guest,
        ),
    );
  }

  /**
   * Find an accepted or connected
   * guest for a specific LIVE.
   *
   * This is used by the LIVE join
   * endpoint to determine whether
   * the user is allowed to publish
   * audio/video.
   */
  async getGuestsForUser(
    guestUserId: string,
    streamId: string,
  ) {
    return this.liveGuestModel.findOne({
      guestUserId,
      streamId,
      status: {
        $in: [
          "accepted",
          "connected",
        ],
      },
    });
  }

  /**
   * Mark an accepted guest as
   * connected.
   *
   * Reconnect-safe:
   * - accepted -> connected
   * - connected -> connected
   *
   * This prevents a reconnect from failing
   * simply because the guest was already
   * marked connected.
   */
  async markConnected(
    guestUserId: string,
    streamId: string,
  ) {
    const guest =
      await this.liveGuestModel.findOne({
        guestUserId,
        streamId,
        status: {
          $in: [
            "accepted",
            "connected",
          ],
        },
      });

    if (!guest) {
      throw new NotFoundException(
        "Accepted or connected guest invitation not found.",
      );
    }

    if (
      guest.status !== "connected"
    ) {
      guest.status =
        "connected";

      guest.connectedAt =
        new Date();

      await guest.save();
    } else if (
      !guest.connectedAt
    ) {
      guest.connectedAt =
        new Date();

      await guest.save();
    }

    return this.serialize(
      guest,
    );
  }

  /**
   * Host removes a guest.
   */
  async remove(
    hostId: string,
    streamId: string,
    guestUserId: string,
  ) {
    const guest =
      await this.liveGuestModel.findOne({
        streamId,
        guestUserId,
      });

    if (!guest) {
      throw new NotFoundException(
        "Guest not found.",
      );
    }

    if (
      String(guest.hostId) !==
      String(hostId)
    ) {
      throw new BadRequestException(
        "Only the LIVE host can remove a guest.",
      );
    }

    guest.status =
      "removed";

    guest.removedAt =
      new Date();

    await guest.save();

    return this.serialize(
      guest,
    );
  }

  /**
   * Mark guest as disconnected.
   */
  async markLeft(
    guestUserId: string,
    streamId: string,
  ) {
    const guest =
      await this.liveGuestModel.findOne({
        guestUserId,
        streamId,
        status: "connected",
      });

    if (!guest) {
      return null;
    }

    guest.status =
      "left";

    guest.disconnectedAt =
      new Date();

    await guest.save();

    return this.serialize(
      guest,
    );
  }

  /**
   * When the host ends the LIVE,
   * close all active guest records.
   */
  async endStream(
    streamId: string,
  ) {
    await this.liveGuestModel.updateMany(
      {
        streamId,
        status: {
          $in: [
            "invited",
            "accepted",
            "connected",
          ],
        },
      },
      {
        $set: {
          status: "left",
          disconnectedAt:
            new Date(),
        },
      },
    );

    return {
      success: true,
    };
  }

  private serialize(
    guest: any,
  ) {
    return {
      id: String(
        guest._id,
      ),

      streamId:
        String(
          guest.streamId,
        ),

      hostId:
        String(
          guest.hostId,
        ),

      guestUserId:
        String(
          guest.guestUserId,
        ),

      status:
        guest.status,

      message:
        guest.message || "",

      invitedAt:
        guest.invitedAt || null,

      respondedAt:
        guest.respondedAt || null,

      connectedAt:
        guest.connectedAt || null,

      disconnectedAt:
        guest.disconnectedAt || null,

      removedAt:
        guest.removedAt || null,

      createdAt:
        guest.createdAt || null,

      updatedAt:
        guest.updatedAt || null,
    };
  }
}
