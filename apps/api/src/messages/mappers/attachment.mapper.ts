export function mapAttachment(
  attachment: any,
) {
  if (!attachment) {
    return null;
  }

  return {
    id: String(attachment.id),

    kind: attachment.kind,

    url: attachment.url,

    name: attachment.name,

    size: Number(attachment.size || 0),

    mimeType: attachment.mimeType,

    ...(attachment.width != null
      ? {
          width: Number(
            attachment.width,
          ),
        }
      : {}),

    ...(attachment.height != null
      ? {
          height: Number(
            attachment.height,
          ),
        }
      : {}),

    ...(attachment.duration != null
      ? {
          duration: Number(
            attachment.duration,
          ),
        }
      : {}),

    ...(attachment.waveform
      ? {
          waveform:
            attachment.waveform.map(
              Number,
            ),
        }
      : {}),

    ...(attachment.thumbnailUrl
      ? {
          thumbnailUrl:
            attachment.thumbnailUrl,
        }
      : {}),

    ...(attachment.caption
      ? {
          caption:
            attachment.caption,
        }
      : {}),
  };
}