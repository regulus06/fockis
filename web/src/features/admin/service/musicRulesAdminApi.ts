import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  MusicRulesConfig,
  UpdateMusicRulesPayload,
} from '../types/musicRulesAdmin.types';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

const STORAGE_KEY = 'fockis_music_platform_rules';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

function getLocalRules(): MusicRulesConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as MusicRulesConfig;
  } catch {
    return null;
  }
}

function saveLocalRules(
  rules: MusicRulesConfig,
): MusicRulesConfig {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(rules),
  );

  return rules;
}

export const musicRulesAdminApi = {
  async getRules(): Promise<MusicRulesConfig> {
    try {
      return await request<MusicRulesConfig>(
        '/admin/music/rules',
      );
    } catch {
      const localRules = getLocalRules();

      if (localRules) {
        return localRules;
      }

      throw new Error(
        'Music rules could not be loaded. The admin music rules API is unavailable.',
      );
    }
  },

  async updateRules(
    payload: UpdateMusicRulesPayload,
  ): Promise<MusicRulesConfig> {
    try {
      return await request<MusicRulesConfig>(
        '/admin/music/rules',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      );
    } catch {
      const current = getLocalRules();

      const rules: MusicRulesConfig = {
        id:
          current?.id ||
          'music-platform-rules',

        version:
          (current?.version || 0) + 1,

        ...payload,

        updatedAt:
          new Date().toISOString(),
      };

      return saveLocalRules(rules);
    }
  },

  async resetRules(): Promise<MusicRulesConfig> {
    try {
      return await request<MusicRulesConfig>(
        '/admin/music/rules/reset',
        {
          method: 'POST',
        },
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);

      throw new Error(
        'The server reset endpoint is unavailable. Local rules were cleared.',
      );
    }
  },
};