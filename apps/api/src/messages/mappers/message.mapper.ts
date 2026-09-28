import {
  mapAttachment,
} from "./attachment.mapper";

export function mapMessage(
  message: any,
  currentUserId: string,
) {
  const senderId =
    String(
      message.senderId?._id ||
        message.senderId,
    );

  let status =
    message.status || "sent";

  if (
    senderId === currentUserId
  ) {
    const readBy =
      (message.readBy || []).map(
        (id: any) =>
          String(id?._id || id),
      );

    const deliveredTo =
      (message.deliveredTo || []).map(
        (id: any) =>
          String(id?._id || id),
      );

    if (
      readBy.some(
        (id) => id !== currentUserId,
      )
    ) {
      status = "read";
    } else if (
      deliveredTo.some(
        (id) => id !== currentUserId,
      )
    ) {
      status = "delivered";
    }
  }

  return {
    id: String(
      message._id,
    ),

    conversationId:
      String(
        message.conversationId?._id ||
          message.conversationId,
      ),

    senderId,

    type:
      message.type,

    ...(message.text
      ? {
          text:
            message.text,
        }
      : {}),

    attachments:
      (message.attachments || [])
        .map(mapAttachment),

    reactions:
      (message.reactions || []).map(
        (reaction: any) => ({
          emoji:
            reaction.emoji,

          userIds:
            (reaction.userIds || []).map(
              (id: any) =>
                String(
                  id?._id || id,
                ),
            ),
        }),
      ),

    ...(message.replyTo
      ? {
          replyTo: {
            messageId:
              String(
                message.replyTo
                  .messageId,
              ),

            senderName:
              message.replyTo
                .senderName,

            preview:
              message.replyTo
                .preview,

            type:
              message.replyTo
                .type,
          },
        }
      : {}),

    status,

    createdAt:
      new Date(
        message.createdAt,
      ).toISOString(),

    ...(message.editedAt
      ? {
          editedAt:
            new Date(
              message.editedAt,
            ).toISOString(),
        }
      : {}),

    deletedForEveryone:
      Boolean(
        message.deletedForEveryone,
      ),

    deletedForMe:
      (
        message.deletedForMeBy || []
      ).some(
        (id: any) =>
          String(
            id?._id || id,
          ) === currentUserId,
      ),

    starred:
      (
        message.starredBy || []
      ).some(
        (id: any) =>
          String(
            id?._id || id,
          ) === currentUserId,
      ),

    ...(message.systemLabel
      ? {
          systemLabel:
            message.systemLabel,
        }
      : {}),
  };
}