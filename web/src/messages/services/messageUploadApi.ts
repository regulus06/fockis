import { FOCKIS_API_URL } from "../../config/fockisConfig";

/**
 * FOCKIS MESSAGES
 * REAL MEDIA UPLOAD API
 *
 * Supports:
 * - images
 * - videos
 * - documents
 * - audio / voice messages
 *
 * Backend:
 * POST /messages/uploads
 *
 * The backend expects the multipart field:
 * "files"
 */

import type {
  Attachment,
  AttachmentKind,
} from "../types";

import {
  formatFileSize,
} from "../utils/fileHelpers";

import {
  generateWaveform,
} from "../utils/audioHelpers";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}

export interface UploadCallbacks {
  onProgress?: (
    progress: number,
  ) => void;
}

interface UploadResponse {
  attachment?: Attachment;
  data?: Attachment;

  id?: string;
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  kind?: AttachmentKind;

  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
  thumbnailUrl?: string;
}

function normalizeAttachment(
  response: UploadResponse | Attachment,
  file: File,
  kind: AttachmentKind,
): Attachment {
  /*
   * Handle all of these possible backend
   * response formats:
   *
   * { attachment: {...} }
   * { data: {...} }
   * { id, url, ... }
   */

  const raw =
    (response as UploadResponse).attachment ??
    (response as UploadResponse).data ??
    response;

  if (!raw?.url) {
    throw new Error(
      "Upload succeeded but the server did not return an attachment URL.",
    );
  }

  return {
    id:
      raw.id ??
      `${kind}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    kind:
      raw.kind ??
      kind,

    url:
      raw.url,

    name:
      raw.name ??
      file.name,

    size:
      raw.size ??
      file.size,

    mimeType:
      raw.mimeType ??
      file.type,

    width:
      raw.width,

    height:
      raw.height,

    duration:
      raw.duration,

    waveform:
      raw.waveform,

    thumbnailUrl:
      raw.thumbnailUrl,
  };
}

export const messageUploadApi = {
  async upload(
    file: File,
    kind: AttachmentKind,
    callbacks: UploadCallbacks = {},
  ): Promise<Attachment> {
    if (!file) {
      throw new Error(
        "No file selected.",
      );
    }

    const token = getToken();

    const formData =
      new FormData();

    /*
     * IMPORTANT:
     *
     * Backend uses:
     * FilesInterceptor("files", ...)
     *
     * Therefore the field MUST be
     * "files", not "file".
     */
    formData.append(
      "files",
      file,
    );

    /*
     * Kind is useful metadata for the
     * backend and is harmless if the
     * multer layer ignores it.
     */
    formData.append(
      "kind",
      kind,
    );

    return new Promise<Attachment>(
      (resolve, reject) => {
        const xhr =
          new XMLHttpRequest();

        xhr.open(
          "POST",
          `${API_BASE}/messages/uploads`,
          true,
        );

        xhr.setRequestHeader(
          "Accept",
          "application/json",
        );

        if (token) {
          xhr.setRequestHeader(
            "Authorization",
            `Bearer ${token}`,
          );
        }

        xhr.upload.onprogress = (
          event,
        ) => {
          if (
            !event.lengthComputable
          ) {
            return;
          }

          const progress =
            Math.round(
              (event.loaded /
                event.total) *
                100,
            );

          callbacks.onProgress?.(
            progress,
          );
        };

        xhr.onload = () => {
          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {
            let message =
              `Upload failed with status ${xhr.status}`;

            try {
              const parsed =
                JSON.parse(
                  xhr.responseText,
                );

              if (
                parsed?.message
              ) {
                message =
                  Array.isArray(
                    parsed.message,
                  )
                    ? parsed.message.join(
                        ", ",
                      )
                    : String(
                        parsed.message,
                      );
              }
            } catch {
              // Keep default error.
            }

            reject(
              new Error(message),
            );

            return;
          }

          try {
            const parsed =
              JSON.parse(
                xhr.responseText,
              ) as
                | UploadResponse
                | UploadResponse[]
                | Attachment;

            /*
             * The backend returns a single
             * attachment when one file is
             * uploaded.
             *
             * Still support an array in
             * case the endpoint returns
             * multiple attachments.
             */
            const response =
              Array.isArray(parsed)
                ? parsed[0]
                : parsed;

            if (!response) {
              throw new Error(
                "The upload server returned no attachment.",
              );
            }

            const attachment =
              normalizeAttachment(
                response,
                file,
                kind,
              );

            callbacks.onProgress?.(
              100,
            );

            resolve(
              attachment,
            );
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    "The upload server returned an invalid response.",
                  ),
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              "Network error while uploading the file.",
            ),
          );
        };

        xhr.onabort = () => {
          reject(
            new Error(
              "Upload was cancelled.",
            ),
          );
        };

        xhr.ontimeout = () => {
          reject(
            new Error(
              "Upload timed out.",
            ),
          );
        };

        xhr.timeout = 120000;

        xhr.send(
          formData,
        );
      },
    );
  },

  formatSizeLabel(
    bytes: number,
  ): string {
    return formatFileSize(
      bytes,
    );
  },

  createWaveform(): number[] {
    return generateWaveform();
  },
};