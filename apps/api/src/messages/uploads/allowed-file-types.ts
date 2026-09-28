export const ALLOWED_UPLOADS = {
  image: {
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
    extensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
    ],
    maxSize:
      15 * 1024 * 1024,
  },

  video: {
    mimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    extensions: [
      ".mp4",
      ".webm",
      ".mov",
    ],
    maxSize:
      250 * 1024 * 1024,
  },

  audio: {
    mimeTypes: [
      "audio/webm",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/wav",
    ],
    extensions: [
      ".webm",
      ".mp3",
      ".m4a",
      ".ogg",
      ".wav",
    ],
    maxSize:
      50 * 1024 * 1024,
  },

  document: {
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [
      ".pdf",
      ".txt",
      ".doc",
      ".docx",
    ],
    maxSize:
      25 * 1024 * 1024,
  },
} as const;

export type AllowedUploadKind =
  keyof typeof ALLOWED_UPLOADS;