import { apiClient } from '../../careers/services/apiClient';
import type { PlaybackUrlResponse } from '../types/music.types';

// ============================================================================
// HELPERS
// ============================================================================

function normalizePlaybackResponse(
  response: PlaybackUrlResponse,
): PlaybackUrlResponse {
  if (!response || typeof response !== 'object') {
    throw new Error(
      'Music playback service returned an invalid response.',
    );
  }

  if (
    typeof response.url !== 'string' ||
    !response.url.trim()
  ) {
    throw new Error(
      'Music playback service did not return a playback URL.',
    );
  }

  let url = response.url.trim();

  // --------------------------------------------------------------------------
  // IMPORTANT:
  //
  // Authorized playback URLs belong to:
  //
  //   /music/entitlements/playback/<token>
  //
  // They MUST NOT become:
  //
  //   /uploads/music/entitlements/playback/<token>
  //
  // --------------------------------------------------------------------------

  if (
    url.startsWith('/uploads/music/entitlements/playback/')
  ) {
    url = url.replace(
      /^\/uploads\/music\/entitlements\/playback\//i,
      '/music/entitlements/playback/',
    );
  }

  // --------------------------------------------------------------------------
  // Never allow an accidental uploads prefix.
  // --------------------------------------------------------------------------

  if (
    url.startsWith('uploads/music/entitlements/playback/')
  ) {
    url = url.replace(
      /^uploads\/music\/entitlements\/playback\//i,
      '/music/entitlements/playback/',
    );
  }

  return {
    ...response,
    url,
  };
}

// ============================================================================
// API
// ============================================================================

export const musicEntitlementApi = {
  /**
   * Called immediately before playback and again when
   * the short-lived playback URL needs to be renewed.
   *
   * The server decides whether the user receives:
   *
   *   full
   *   preview
   *   denied
   *
   * Never cache this URL long-term on the client.
   */
  async getPlaybackUrl(
    contentId: string,
  ): Promise<PlaybackUrlResponse> {
    if (
      typeof contentId !== 'string' ||
      !contentId.trim()
    ) {
      throw new Error(
        'Music content ID is required for playback.',
      );
    }

    const response =
      await apiClient.get<PlaybackUrlResponse>(
        `/music/entitlements/${encodeURIComponent(
          contentId.trim(),
        )}/playback-url`,
      );

    const normalized =
      normalizePlaybackResponse(response);

    console.log(
      '[MusicEntitlementApi] Authorized playback URL:',
      {
        contentId: contentId.trim(),
        level: normalized.level,
        expiresInSeconds:
          normalized.expiresInSeconds,
        url: normalized.url,
      },
    );

    return normalized;
  },

  /**
   * Get the current user's music entitlements.
   */
  myEntitlements: () =>
    apiClient.get(
      '/music/entitlements/mine',
    ),
};