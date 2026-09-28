import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

import {
  AccessToken,
  VideoGrant,
} from "livekit-server-sdk";

import {
  createParticipantIdentity,
} from "../utils/live-room.util";


@Injectable()
export class LiveTokenService {

  async createToken(params: {
    userId: string;
    userName?: string;
    roomName: string;
    canPublish: boolean;
    canSubscribe: boolean;
  }): Promise<string> {

    // NOTE: .trim() guards against a trailing newline/space in .env,
    // which silently produces an invalid signature LiveKit rejects
    // with "could not establish signal connection: invalid token".
    const apiKey =
      process.env.LIVEKIT_API_KEY?.trim();

    const apiSecret =
      process.env.LIVEKIT_API_SECRET?.trim();


    if (
      !apiKey ||
      !apiSecret
    ) {
      throw new InternalServerErrorException(
        "LiveKit credentials are not configured.",
      );
    }


    if (
      !params.userId ||
      !params.userId.trim()
    ) {
      throw new BadRequestException(
        "A valid user ID is required.",
      );
    }


    if (
      !params.roomName ||
      !params.roomName.trim()
    ) {
      throw new BadRequestException(
        "A valid LIVE room is required.",
      );
    }


    const identity =
      createParticipantIdentity(
        params.userId,
      );


    const displayName =
      params.userName?.trim() ||
      `Fockis User ${params.userId}`;


    const accessToken =
      new AccessToken(
        apiKey,
        apiSecret,
        {
          identity,

          name:
            displayName.substring(
              0,
              150,
            ),

          // 2 hours in seconds
          ttl: 7200,
        },
      );


    const grant: VideoGrant = {

      room:
        params.roomName,

      roomJoin: true,

      canPublish:
        Boolean(
          params.canPublish,
        ),

      canSubscribe:
        Boolean(
          params.canSubscribe,
        ),

      canPublishData: true,
    };


    accessToken.addGrant(
      grant,
    );

    // v2 SDK: toJwt() is async — must be awaited explicitly.
    const jwt =
      await accessToken.toJwt();


    // Debug log with credentials REMOVED. Never log apiKey/apiSecret,
    // even partially — logs get shipped to aggregators/third parties.
    console.log(
      "LiveKit token created",
      {
        identity,
        room: params.roomName,
        canPublish: params.canPublish,
        canSubscribe: params.canSubscribe,
      },
    );


    return jwt;
  }
}